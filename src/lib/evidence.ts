/**
 * HarvestLink: Physical-to-Digital Handover Evidence (G3)
 * Based on IEEE Manuscript T4-2026-044, Section V-C, Equation (13).
 *
 * Implements evidence completeness scoring:
 * C_e = (1 / m) * sum_{k=1}^m 1[ f_k present and valid ]  (Eq 13)
 *
 * Captures:
 * - Vehicle / carrier registration
 * - Tamper-evident seal numbers
 * - Calibrated weighbridge slip / scale certificates
 * - Grain quality inspection (moisture %, pest inspection, hygiene)
 * - Cryptographic receiver sign-off
 */

export interface HandoverEvidenceData {
  shipmentId: string;
  lotId: string;
  senderAddress: string;
  receiverAddress: string;
  vehicleCarrierRef?: string;
  sealId?: string;
  dispatchQty: number;
  receiptQty?: number;
  weighmentSlipRef?: string;
  inspectionPassed?: boolean;
  moisturePercentage?: number; // Ideal: 10% - 14% for grains
  pestFree?: boolean;
  documentHash?: string;
  receiverSignature?: string;
}

export interface CompletenessReport {
  score: number; // 0.0 to 1.0 (C_e)
  totalFields: number;
  validFields: number;
  fieldResults: Record<string, { present: boolean; valid: boolean; notes?: string }>;
  isCompliant: boolean; // True if C_e >= 0.85
}

/**
 * Calculates evidence completeness C_e according to Equation (13).
 */
export function calculateEvidenceCompleteness(
  data: HandoverEvidenceData
): CompletenessReport {
  const fieldsToCheck: Record<
    string,
    { check: () => { present: boolean; valid: boolean; notes?: string } }
  > = {
    shipmentId: {
      check: () => ({
        present: Boolean(data.shipmentId),
        valid: Boolean(data.shipmentId && data.shipmentId.length >= 4),
      }),
    },
    lotId: {
      check: () => ({
        present: Boolean(data.lotId),
        valid: Boolean(data.lotId && data.lotId.length >= 4),
      }),
    },
    senderAddress: {
      check: () => ({
        present: Boolean(data.senderAddress),
        valid: Boolean(data.senderAddress && data.senderAddress.startsWith('0x')),
      }),
    },
    receiverAddress: {
      check: () => ({
        present: Boolean(data.receiverAddress),
        valid: Boolean(data.receiverAddress && data.receiverAddress.startsWith('0x')),
      }),
    },
    vehicleCarrierRef: {
      check: () => ({
        present: Boolean(data.vehicleCarrierRef),
        valid: Boolean(data.vehicleCarrierRef && data.vehicleCarrierRef.length >= 5),
        notes: 'Carrier or vehicle license number',
      }),
    },
    sealId: {
      check: () => ({
        present: Boolean(data.sealId),
        valid: Boolean(data.sealId && data.sealId.length >= 3),
        notes: 'Tamper-evident container seal',
      }),
    },
    dispatchQty: {
      check: () => ({
        present: data.dispatchQty !== undefined && data.dispatchQty !== null,
        valid: typeof data.dispatchQty === 'number' && data.dispatchQty > 0,
      }),
    },
    receiptQty: {
      check: () => ({
        present: data.receiptQty !== undefined && data.receiptQty !== null,
        valid: typeof data.receiptQty === 'number' && data.receiptQty > 0,
      }),
    },
    weighmentSlipRef: {
      check: () => ({
        present: Boolean(data.weighmentSlipRef),
        valid: Boolean(data.weighmentSlipRef && data.weighmentSlipRef.length >= 4),
        notes: 'Calibrated weighbridge slip identifier',
      }),
    },
    inspectionPassed: {
      check: () => ({
        present: data.inspectionPassed !== undefined,
        valid: data.inspectionPassed === true,
        notes: 'Quality inspection certificate',
      }),
    },
    moisturePercentage: {
      check: () => {
        const present = data.moisturePercentage !== undefined && data.moisturePercentage !== null;
        // Grains: standard moisture content between 8% and 14%
        const valid = present && data.moisturePercentage! >= 8 && data.moisturePercentage! <= 14;
        return {
          present,
          valid,
          notes: present ? `Moisture: ${data.moisturePercentage}% (safe range 8-14%)` : undefined,
        };
      },
    },
    pestFree: {
      check: () => ({
        present: data.pestFree !== undefined,
        valid: data.pestFree === true,
        notes: 'Pest/infestation check',
      }),
    },
    receiverSignature: {
      check: () => ({
        present: Boolean(data.receiverSignature),
        valid: Boolean(data.receiverSignature && data.receiverSignature.length >= 10),
        notes: 'Cryptographic receiver handover signature',
      }),
    },
  };

  const fieldKeys = Object.keys(fieldsToCheck);
  const m = fieldKeys.length;
  let validCount = 0;
  const fieldResults: Record<string, { present: boolean; valid: boolean; notes?: string }> = {};

  for (const key of fieldKeys) {
    const res = fieldsToCheck[key].check();
    fieldResults[key] = res;
    if (res.present && res.valid) {
      validCount += 1;
    }
  }

  // Eq (13): C_e = (1 / m) * sum 1[f_k present and valid]
  const score = validCount / m;

  return {
    score: Number(score.toFixed(3)),
    totalFields: m,
    validFields: validCount,
    fieldResults,
    isCompliant: score >= 0.8,
  };
}
