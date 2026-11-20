/**
 * HarvestLink: Offline-First Event Capture & Synchronisation (G2)
 * Based on IEEE Manuscript T4-2026-044, Section V-B, Equations (11)-(12).
 *
 * Implements tamper-evident hash chaining:
 * pi_e = H( event_id || n_e || pi_pred(e) || H(payload_e) )  (Eq 11)
 *
 * Integrity predicate:
 * V(e) = A(e) ^ S(e) ^ P(e) ^ U(e)                            (Eq 12)
 * Where:
 * - A(e): Actor authority verification
 * - S(e): Signature & payload hash verification
 * - P(e): Predecessor hash / sequence continuity
 * - U(e): Unique event_id (idempotency check)
 */

import { ethers } from 'ethers';

export interface OfflinePdsEvent {
  eventId: string;
  deviceId: string;
  actorAddress: string;
  sequenceNumber: number; // n_e
  capturedAt: string; // ISO timestamp
  predHash: string; // pi_pred(e) (or "GENESIS" for the first event)
  payload: Record<string, any>;
  payloadHash: string; // H(payload_e)
  chainPi: string; // pi_e
  signature: string; // EIP-191 personal_sign over chainPi
  syncStatus: 'PENDING' | 'VALIDATED' | 'COMMITTED' | 'QUARANTINED' | 'REJECTED';
  quarantineReason?: string;
  chainTxHash?: string;
}

const LOCAL_STORAGE_QUEUE_KEY = 'harvestlink_offline_event_queue';

/**
 * Computes deterministic SHA-256 hash of a JSON payload.
 */
export function hashPayload(payload: Record<string, any>): string {
  const sortedKeys = Object.keys(payload).sort();
  const canonical = JSON.stringify(payload, sortedKeys);
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}

/**
 * Computes hash-chain value pi_e using Equation (11).
 */
export function computeChainPi(
  eventId: string,
  sequenceNumber: number,
  predHash: string,
  payloadHash: string
): string {
  const packed = ethers.solidityPacked(
    ['string', 'uint64', 'string', 'string'],
    [eventId, sequenceNumber, predHash, payloadHash]
  );
  return ethers.keccak256(packed);
}

/**
 * Validates the cryptographic integrity predicate V(e) (Eq 12).
 */
export function verifyEventIntegrity(
  event: OfflinePdsEvent,
  expectedPredHash: string,
  existingEventIds: Set<string>
): { isValid: boolean; failures: string[] } {
  const failures: string[] = [];

  // U(e): Uniqueness / Idempotency check
  if (existingEventIds.has(event.eventId)) {
    failures.push('U(e) Failed: Duplicate event_id detected');
  }

  // P(e): Predecessor hash check
  if (event.predHash !== expectedPredHash) {
    failures.push(`P(e) Failed: Predecessor hash mismatch (expected ${expectedPredHash.slice(0, 8)}, got ${event.predHash.slice(0, 8)})`);
  }

  // S(e) Part 1: Payload hash verification
  const computedPayloadHash = hashPayload(event.payload);
  if (computedPayloadHash !== event.payloadHash) {
    failures.push('S(e) Failed: Payload content does not match payloadHash');
  }

  // S(e) Part 2: ChainPi recomputation
  const recomputedPi = computeChainPi(
    event.eventId,
    event.sequenceNumber,
    event.predHash,
    event.payloadHash
  );
  if (recomputedPi !== event.chainPi) {
    failures.push('S(e) Failed: chainPi hash calculation mismatch');
  }

  // S(e) Part 3: Signature verification
  try {
    const recoveredSigner = ethers.verifyMessage(ethers.getBytes(event.chainPi), event.signature);
    if (recoveredSigner.toLowerCase() !== event.actorAddress.toLowerCase()) {
      failures.push(`A(e)/S(e) Failed: Recovered signer ${recoveredSigner} does not match actorAddress ${event.actorAddress}`);
    }
  } catch (err: any) {
    failures.push(`S(e) Failed: Invalid cryptographic signature (${err.message})`);
  }

  return {
    isValid: failures.length === 0,
    failures,
  };
}

/**
 * Client-side offline queue manager.
 */
export class OfflineQueueManager {
  private static getStoredQueue(): OfflinePdsEvent[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private static saveQueue(queue: OfflinePdsEvent[]): void {
    localStorage.setItem(LOCAL_STORAGE_QUEUE_KEY, JSON.stringify(queue));
  }

  public static listEvents(): OfflinePdsEvent[] {
    return this.getStoredQueue();
  }

  public static getLatestChainPi(deviceId: string): string {
    const deviceEvents = this.getStoredQueue().filter(e => e.deviceId === deviceId);
    if (deviceEvents.length === 0) return '0x0000000000000000000000000000000000000000000000000000000000000000';
    return deviceEvents[deviceEvents.length - 1].chainPi;
  }

  public static getNextSequenceNumber(deviceId: string): number {
    const deviceEvents = this.getStoredQueue().filter(e => e.deviceId === deviceId);
    return deviceEvents.length + 1;
  }

  /**
   * Enqueues a newly captured offline event.
   */
  public static async enqueueEvent(
    deviceId: string,
    signer: ethers.Signer,
    payload: Record<string, any>
  ): Promise<OfflinePdsEvent> {
    const queue = this.getStoredQueue();
    const actorAddress = await signer.getAddress();
    const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const sequenceNumber = this.getNextSequenceNumber(deviceId);
    const predHash = this.getLatestChainPi(deviceId);
    const payloadHash = hashPayload(payload);
    const chainPi = computeChainPi(eventId, sequenceNumber, predHash, payloadHash);

    // Sign the hash using Ethereum personal_sign
    const signature = await signer.signMessage(ethers.getBytes(chainPi));

    const newEvent: OfflinePdsEvent = {
      eventId,
      deviceId,
      actorAddress,
      sequenceNumber,
      capturedAt: new Date().toISOString(),
      predHash,
      payload,
      payloadHash,
      chainPi,
      signature,
      syncStatus: 'PENDING',
    };

    queue.push(newEvent);
    this.saveQueue(queue);
    return newEvent;
  }

  public static updateEventStatus(
    eventId: string,
    status: OfflinePdsEvent['syncStatus'],
    txHash?: string,
    quarantineReason?: string
  ): void {
    const queue = this.getStoredQueue();
    const evt = queue.find(e => e.eventId === eventId);
    if (evt) {
      evt.syncStatus = status;
      if (txHash) evt.chainTxHash = txHash;
      if (quarantineReason) evt.quarantineReason = quarantineReason;
      this.saveQueue(queue);
    }
  }

  public static clearCommitted(): void {
    const queue = this.getStoredQueue().filter(e => e.syncStatus !== 'COMMITTED');
    this.saveQueue(queue);
  }
}
