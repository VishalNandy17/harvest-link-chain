import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  OfflineQueueManager,
  OfflinePdsEvent,
  verifyEventIntegrity,
} from '@/lib/offlineQueue';
import { WifiOff, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import { ethers } from 'ethers';

export const OfflineQueueTab: React.FC = () => {
  const [events, setEvents] = useState<OfflinePdsEvent[]>([]);
  const [deviceId] = useState('DEVICE-KALYANI-POS-04');
  const [simulatedAction, setSimulatedAction] = useState('beneficiary_distribution');
  const [simulatedQty, setSimulatedQty] = useState('25.0');
  const [simulatedLot, setSimulatedLot] = useState('LOT-2026-WB-0982');
  const [busy, setBusy] = useState(false);

  const loadQueue = () => {
    setEvents(OfflineQueueManager.listEvents());
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleCaptureOfflineEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask or Web3 wallet required to cryptographically sign offline event.');
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const payload = {
        action: simulatedAction,
        lotId: simulatedLot,
        quantityKg: parseFloat(simulatedQty) || 0,
        timestamp: Date.now(),
        locationLat: 22.975,
        locationLon: 88.434,
      };

      const newEvent = await OfflineQueueManager.enqueueEvent(deviceId, signer, payload);
      toast({
        title: 'Offline Event Queued',
        description: `Event ID: ${newEvent.eventId} hash-chained as #${newEvent.sequenceNumber}`,
      });
      loadQueue();
    } catch (err: any) {
      toast({
        title: 'Capture Failed',
        description: err.message || 'Could not sign event',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyQueue = () => {
    const queue = OfflineQueueManager.listEvents();
    if (queue.length === 0) {
      toast({ title: 'Queue Empty', description: 'No events to verify.' });
      return;
    }

    const seenIds = new Set<string>();
    let expectedPred = '0x0000000000000000000000000000000000000000000000000000000000000000';
    let allValid = true;

    for (const evt of queue) {
      const { isValid, failures } = verifyEventIntegrity(evt, expectedPred, seenIds);
      if (!isValid) {
        allValid = false;
        OfflineQueueManager.updateEventStatus(evt.eventId, 'QUARANTINED', undefined, failures.join('; '));
      } else {
        seenIds.add(evt.eventId);
        expectedPred = evt.chainPi;
        if (evt.syncStatus === 'PENDING') {
          OfflineQueueManager.updateEventStatus(evt.eventId, 'VALIDATED');
        }
      }
    }

    loadQueue();
    if (allValid) {
      toast({
        title: 'Integrity Predicate V(e) Verified',
        description: 'All queued events passed hash-chaining, authority, and signature checks (Eq 12).',
      });
    } else {
      toast({
        title: 'Tampering or Collision Detected',
        description: 'Compromised events quarantined for human audit.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <WifiOff className="h-5 w-5 text-primary" />
                Offline-First Event Capture & Local Hash Chaining (G2)
              </CardTitle>
              <CardDescription>
                Implements Equations (11)–(12): Encrypted local device queue with cryptographic hash chaining pi_e = H(event_id || n_e || pi_pred || H(payload)) and integrity predicate V(e) = A(e) &and; S(e) &and; P(e) &and; U(e).
              </CardDescription>
            </div>
            <Badge variant="outline">Eqs (11)–(12) Model</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCaptureOfflineEvent} className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Device Identifier</Label>
              <Input className="mt-1 font-mono text-xs" value={deviceId} disabled />
            </div>

            <div>
              <Label>Operation Type</Label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={simulatedAction}
                onChange={e => setSimulatedAction(e.target.value)}
              >
                <option value="beneficiary_distribution">Beneficiary Distribution</option>
                <option value="custody_handover">In-Field Custody Handover</option>
                <option value="weighment_checkpoint">En-route Weighment Checkpoint</option>
              </select>
            </div>

            <div>
              <Label>Target Lot ID</Label>
              <Input className="mt-1" value={simulatedLot} onChange={e => setSimulatedLot(e.target.value)} />
            </div>

            <div>
              <Label>Quantity (kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1"
                value={simulatedQty}
                onChange={e => setSimulatedQty(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2 md:col-span-4">
              <Button type="submit" disabled={busy} className="flex-1">
                <WifiOff className="mr-2 h-4 w-4" />
                Capture & Cryptographically Sign Offline Event
              </Button>
              <Button type="button" variant="outline" onClick={handleVerifyQueue}>
                <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                Verify Integrity Predicate V(e)
              </Button>
              <Button type="button" variant="ghost" onClick={loadQueue}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Queued Events List */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Local Encrypted Queue ({events.length} events)</h3>
              {events.length > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    localStorage.removeItem('harvestlink_offline_event_queue');
                    loadQueue();
                  }}
                >
                  Clear Local Queue
                </Button>
              )}
            </div>

            {events.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No offline events currently in device storage. Simulate capturing an event above.
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((evt, idx) => (
                  <div
                    key={evt.eventId}
                    className={`rounded-lg border p-3 text-xs ${
                      evt.syncStatus === 'QUARANTINED'
                        ? 'border-destructive bg-destructive/10'
                        : evt.syncStatus === 'VALIDATED'
                        ? 'border-green-500/40 bg-green-500/5'
                        : 'bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary">#{evt.sequenceNumber}</span>
                        <span className="font-semibold">{evt.eventId}</span>
                        <Badge variant="outline">{evt.payload.action}</Badge>
                      </div>
                      <Badge
                        variant={
                          evt.syncStatus === 'VALIDATED'
                            ? 'default'
                            : evt.syncStatus === 'QUARANTINED'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {evt.syncStatus}
                      </Badge>
                    </div>

                    <div className="mt-2 grid gap-1 font-mono text-[11px] text-muted-foreground md:grid-cols-2">
                      <div>Signer: {evt.actorAddress.slice(0, 14)}...</div>
                      <div>Captured: {new Date(evt.capturedAt).toLocaleTimeString()}</div>
                      <div className="truncate">Pred Hash: {evt.predHash.slice(0, 20)}...</div>
                      <div className="truncate text-primary">ChainPi: {evt.chainPi.slice(0, 20)}...</div>
                    </div>

                    {evt.quarantineReason && (
                      <div className="mt-2 text-destructive font-semibold">
                        Quarantine Reason: {evt.quarantineReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
