/**
 * HarvestLink: Cross-Stage Quantity Reconciliation Engine (G1)
 * Based on IEEE Manuscript T4-2026-044, Section V-A, Equations (6)-(10).
 *
 * Models inventory conservation across procurement, warehouses, transporters, and FPS outlets:
 * - Expected Closing Stock: S^exp_{v,t} = S^obs_{v,t-1} + I_{v,t} - O_{v,t} - B_{v,t} - L_{v,t} (Eq 6)
 * - Discrepancy: Delta_{v,t} = S^exp_{v,t} - S^obs_{v,t} (Eq 7)
 * - Dynamic Tolerance: tau_{v,t} = max(tau_abs, rho * S^exp_{v,t}) (Eq 8)
 * - Relative Discrepancy: z_{v,t} = |Delta_{v,t}| / max(S^exp_{v,t}, epsilon) (Eq 8)
 * - Deterministic Exception Rule: a^rule_{v,t} = 1[ |Delta_{v,t}| > tau_{v,t} ] (Eq 9)
 * - Lot-level Conservation Residual: r_{l,t} (Eq 10)
 */

export interface FacilityStockRecord {
  facilityId: string;
  facilityName: string;
  facilityType: 'procurement' | 'warehouse' | 'transporter' | 'fps';
  commodity: string;
  period: string; // e.g. "2026-W46"
  sObsPrev: number; // Previous verified physical stock
  inboundQty: number; // Accepted incoming shipments
  outboundQty: number; // Authorized outgoing dispatches
  beneficiaryQty: number; // Distributed to verified beneficiaries
  approvedLossQty: number; // Normal drying/spillage/moisture loss
  sObsNew: number; // Current verified physical stock
}

export interface ReconciliationResult {
  facilityId: string;
  period: string;
  sExp: number;
  sObs: number;
  discrepancy: number; // Delta_{v,t}
  relDiscrepancy: number; // z_{v,t}
  toleranceTau: number; // tau_{v,t}
  isException: boolean; // a^rule_{v,t}
  severity: 'NORMAL' | 'WARN' | 'CRITICAL';
  statusDescription: string;
}

export interface LotResidualCheck {
  lotId: string;
  registeredQty: number; // Q_l
  facilityStockSum: number; // sum_v S^obs,(l)_{v,t}
  inTransitQtySum: number; // sum_{e in T_t} q^{disp}_e
  cumulativeBeneficiaryQty: number; // B^{(l)}_{<=t}
  cumulativeApprovedLoss: number; // L^{(l)}_{<=t}
  residual: number; // r_{l,t}
  tolerance: number;
  isResidualException: boolean;
}

// Configurable tolerances per commodity (defaults compliant with Indian PDS standard)
export const DEFAULT_RECON_CONFIG = {
  tauAbsKg: 10.0, // Absolute tolerance in kg
  rhoRelative: 0.005, // 0.5% scale tolerance
  epsilon: 1e-4,
};

/**
 * Reconciles inventory for a single facility and period using Eqs (6)-(9).
 */
export function reconcileFacilityPeriod(
  record: FacilityStockRecord,
  config = DEFAULT_RECON_CONFIG
): ReconciliationResult {
  // Eq (6): Expected closing stock
  const sExp =
    record.sObsPrev +
    record.inboundQty -
    record.outboundQty -
    record.beneficiaryQty -
    record.approvedLossQty;

  // Eq (7): Discrepancy against new verified count
  const discrepancy = sExp - record.sObsNew;

  // Eq (8): Dynamic tolerance & relative discrepancy
  const toleranceTau = Math.max(config.tauAbsKg, config.rhoRelative * sExp);
  const relDiscrepancy = Math.abs(discrepancy) / Math.max(sExp, config.epsilon);

  // Eq (9): Exception decision rule
  const isException = Math.abs(discrepancy) > toleranceTau;

  let severity: 'NORMAL' | 'WARN' | 'CRITICAL' = 'NORMAL';
  if (isException) {
    severity = relDiscrepancy > 0.02 ? 'CRITICAL' : 'WARN';
  }

  let statusDescription = 'Stock balanced within allowable measurement tolerance';
  if (isException) {
    statusDescription = `Discrepancy of ${discrepancy.toFixed(2)} kg exceeds allowable tolerance of ±${toleranceTau.toFixed(2)} kg (relative: ${(relDiscrepancy * 100).toFixed(2)}%)`;
  }

  return {
    facilityId: record.facilityId,
    period: record.period,
    sExp,
    sObs: record.sObsNew,
    discrepancy,
    relDiscrepancy,
    toleranceTau,
    isException,
    severity,
    statusDescription,
  };
}

/**
 * Computes the global lot-level conservation residual using Eq (10).
 * Detects distributed losses even if individual facilities pass tolerance.
 */
export function computeLotResidual(
  lotCheck: LotResidualCheck,
  config = DEFAULT_RECON_CONFIG
): LotResidualCheck {
  const accountedFor =
    lotCheck.facilityStockSum +
    lotCheck.inTransitQtySum +
    lotCheck.cumulativeBeneficiaryQty +
    lotCheck.cumulativeApprovedLoss;

  // Eq (10): r_{l,t} = Q_l - AccountedFor
  const residual = lotCheck.registeredQty - accountedFor;
  const tolerance = Math.max(config.tauAbsKg, config.rhoRelative * lotCheck.registeredQty);
  const isResidualException = Math.abs(residual) > tolerance;

  return {
    ...lotCheck,
    residual,
    tolerance,
    isResidualException,
  };
}
