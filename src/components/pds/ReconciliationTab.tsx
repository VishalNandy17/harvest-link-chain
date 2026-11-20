import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  reconcileFacilityPeriod,
  computeLotResidual,
  FacilityStockRecord,
  ReconciliationResult,
  LotResidualCheck,
  DEFAULT_RECON_CONFIG,
} from '@/lib/reconciliation';
import { Scale, AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';

export const ReconciliationTab: React.FC = () => {
  // Facility Form State
  const [facilityId, setFacilityId] = useState('WH-KALYANI-01');
  const [facilityName, setFacilityName] = useState('Kalyani Central CWC Warehouse');
  const [facilityType, setFacilityType] = useState<FacilityStockRecord['facilityType']>('warehouse');
  const [commodity, setCommodity] = useState('Wheat (Grade-A)');
  const [period, setPeriod] = useState('2026-W46');
  const [sObsPrev, setSObsPrev] = useState('10000');
  const [inboundQty, setInboundQty] = useState('5000');
  const [outboundQty, setOutboundQty] = useState('3500');
  const [beneficiaryQty, setBeneficiaryQty] = useState('0');
  const [approvedLossQty, setApprovedLossQty] = useState('25');
  const [sObsNew, setSObsNew] = useState('11460'); // 15kg missing (inside or outside tolerance?)

  // Lot Residual State (Eq 10)
  const [lotId, setLotId] = useState('LOT-2026-WB-0982');
  const [registeredQty, setRegisteredQty] = useState('25000');
  const [facilityStockSum, setFacilityStockSum] = useState('14000');
  const [inTransitSum, setInTransitSum] = useState('4500');
  const [beneficiarySum, setBeneficiarySum] = useState('6000');
  const [lossSum, setLossSum] = useState('80');

  const [facilityResult, setFacilityResult] = useState<ReconciliationResult | null>(null);
  const [residualResult, setResidualResult] = useState<LotResidualCheck | null>(null);

  const handleReconcileFacility = (e: React.FormEvent) => {
    e.preventDefault();
    const record: FacilityStockRecord = {
      facilityId,
      facilityName,
      facilityType,
      commodity,
      period,
      sObsPrev: parseFloat(sObsPrev) || 0,
      inboundQty: parseFloat(inboundQty) || 0,
      outboundQty: parseFloat(outboundQty) || 0,
      beneficiaryQty: parseFloat(beneficiaryQty) || 0,
      approvedLossQty: parseFloat(approvedLossQty) || 0,
      sObsNew: parseFloat(sObsNew) || 0,
    };
    const res = reconcileFacilityPeriod(record);
    setFacilityResult(res);
  };

  const handleComputeResidual = (e: React.FormEvent) => {
    e.preventDefault();
    const check: LotResidualCheck = {
      lotId,
      registeredQty: parseFloat(registeredQty) || 0,
      facilityStockSum: parseFloat(facilityStockSum) || 0,
      inTransitQtySum: parseFloat(inTransitSum) || 0,
      cumulativeBeneficiaryQty: parseFloat(beneficiarySum) || 0,
      cumulativeApprovedLoss: parseFloat(lossSum) || 0,
      residual: 0,
      tolerance: 0,
      isResidualException: false,
    };
    const res = computeLotResidual(check);
    setResidualResult(res);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Cross-Stage Facility Stock Reconciliation (G1)
              </CardTitle>
              <CardDescription>
                Evaluates Equations (6)–(9): Verifies expected closing stock S_exp against physical count S_obs with dynamic commodity measurement tolerance &tau;.
              </CardDescription>
            </div>
            <Badge variant="outline">Eqs (6)–(9) Model</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReconcileFacility} className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Facility ID & Type</Label>
              <div className="mt-1 flex gap-2">
                <Input value={facilityId} onChange={e => setFacilityId(e.target.value)} />
                <select
                  className="rounded-md border bg-background px-2 text-xs"
                  value={facilityType}
                  onChange={e => setFacilityType(e.target.value as any)}
                >
                  <option value="warehouse">Warehouse</option>
                  <option value="procurement">Procurement</option>
                  <option value="transporter">Transporter</option>
                  <option value="fps">FPS Outlet</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Commodity & Period</Label>
              <div className="mt-1 flex gap-2">
                <Input value={commodity} onChange={e => setCommodity(e.target.value)} />
                <Input className="w-28" value={period} onChange={e => setPeriod(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Previous Stock S_obs(t-1) (kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1"
                value={sObsPrev}
                onChange={e => setSObsPrev(e.target.value)}
              />
            </div>

            <div>
              <Label>Inbound Received I(t) (kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1"
                value={inboundQty}
                onChange={e => setInboundQty(e.target.value)}
              />
            </div>

            <div>
              <Label>Outbound Dispatched O(t) (kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1"
                value={outboundQty}
                onChange={e => setOutboundQty(e.target.value)}
              />
            </div>

            <div>
              <Label>Approved Loss / Drying L(t) (kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1"
                value={approvedLossQty}
                onChange={e => setApprovedLossQty(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Label className="font-semibold text-primary">New Verified Physical Count S_obs(t) (kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1 border-primary font-bold"
                value={sObsNew}
                onChange={e => setSObsNew(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Run Conservation Check
              </Button>
            </div>
          </form>

          {facilityResult && (
            <div className={`mt-6 rounded-lg border p-4 ${facilityResult.isException ? 'border-destructive bg-destructive/10' : 'border-green-500/30 bg-green-500/5'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {facilityResult.isException ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  <span className="font-bold">
                    {facilityResult.isException ? 'DISCREPANCY EXCEPTION DETECTED' : 'STOCK CONSERVATION PASSED'}
                  </span>
                </div>
                <Badge variant={facilityResult.severity === 'CRITICAL' ? 'destructive' : facilityResult.severity === 'WARN' ? 'secondary' : 'default'}>
                  {facilityResult.severity}
                </Badge>
              </div>

              <div className="mt-4 grid gap-4 text-sm md:grid-cols-4">
                <div className="rounded bg-background/80 p-2">
                  <p className="text-xs text-muted-foreground">Expected Stock S_exp</p>
                  <p className="font-mono text-base font-semibold">{facilityResult.sExp.toFixed(2)} kg</p>
                </div>
                <div className="rounded bg-background/80 p-2">
                  <p className="text-xs text-muted-foreground">Physical Stock S_obs</p>
                  <p className="font-mono text-base font-semibold">{facilityResult.sObs.toFixed(2)} kg</p>
                </div>
                <div className="rounded bg-background/80 p-2">
                  <p className="text-xs text-muted-foreground">Discrepancy &Delta;</p>
                  <p className={`font-mono text-base font-semibold ${facilityResult.discrepancy > 0 ? 'text-destructive' : 'text-primary'}`}>
                    {facilityResult.discrepancy > 0 ? `-${facilityResult.discrepancy.toFixed(2)}` : `+${Math.abs(facilityResult.discrepancy).toFixed(2)}`} kg
                  </p>
                </div>
                <div className="rounded bg-background/80 p-2">
                  <p className="text-xs text-muted-foreground">Allowable Tolerance &tau;</p>
                  <p className="font-mono text-base font-semibold">&plusmn;{facilityResult.toleranceTau.toFixed(2)} kg</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">{facilityResult.statusDescription}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lot-level Conservation Residual Card (Eq 10) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" />
                Global Lot-Level Conservation Residual (Eq 10)
              </CardTitle>
              <CardDescription>
                Tracks distributed losses across multiple stages: r = Q_lot - (&Sigma; S_obs + &Sigma; q_disp + B_cum + L_cum). Detects systemic sub-tolerance leakage.
              </CardDescription>
            </div>
            <Badge variant="outline">Eq (10) Model</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleComputeResidual} className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Lot ID</Label>
              <Input className="mt-1" value={lotId} onChange={e => setLotId(e.target.value)} />
            </div>
            <div>
              <Label>Original Registered Quantity Q_lot (kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1 font-semibold"
                value={registeredQty}
                onChange={e => setRegisteredQty(e.target.value)}
              />
            </div>
            <div>
              <Label>Current Stock at All Facilities (kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1"
                value={facilityStockSum}
                onChange={e => setFacilityStockSum(e.target.value)}
              />
            </div>
            <div>
              <Label>In-Transit Shipments &Sigma; q_disp (kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1"
                value={inTransitSum}
                onChange={e => setInTransitSum(e.target.value)}
              />
            </div>
            <div>
              <Label>Cumulative Beneficiary Issue B (kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1"
                value={beneficiarySum}
                onChange={e => setBeneficiarySum(e.target.value)}
              />
            </div>
            <div>
              <Label>Approved Losses L (kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1"
                value={lossSum}
                onChange={e => setLossSum(e.target.value)}
              />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" variant="outline" className="w-full">
                Compute Lot-Level Residual r_lot
              </Button>
            </div>
          </form>

          {residualResult && (
            <div className={`mt-4 rounded-lg border p-4 ${residualResult.isResidualException ? 'border-destructive bg-destructive/10' : 'border-green-500/30 bg-green-500/5'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-2">
                  {residualResult.isResidualException ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <span>Systemic Lot Residual Leakage Detected!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span>Global Lot Stock Fully Accounted</span>
                    </>
                  )}
                </span>
                <span className="font-mono text-sm">
                  Residual: {residualResult.residual.toFixed(2)} kg (Tolerance: ±{residualResult.tolerance.toFixed(2)} kg)
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
