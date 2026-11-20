import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  calculateEvidenceCompleteness,
  HandoverEvidenceData,
  CompletenessReport,
} from '@/lib/evidence';
import { FileCheck, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

export const EvidenceTab: React.FC = () => {
  const [shipmentId, setShipmentId] = useState('SHP-2026-9812');
  const [lotId, setLotId] = useState('LOT-2026-WB-0982');
  const [senderAddress, setSenderAddress] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [receiverAddress, setReceiverAddress] = useState('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
  const [vehicleCarrierRef, setVehicleCarrierRef] = useState('WB-25-A-8910');
  const [sealId, setSealId] = useState('SEAL-GREEN-9921');
  const [dispatchQty, setDispatchQty] = useState('5000');
  const [receiptQty, setReceiptQty] = useState('4994');
  const [weighmentSlipRef, setWeighmentSlipRef] = useState('WB-SLIP-CWC-2026-44');
  const [inspectionPassed, setInspectionPassed] = useState(true);
  const [moisturePercentage, setMoisturePercentage] = useState('11.5');
  const [pestFree, setPestFree] = useState(true);
  const [receiverSignature, setReceiverSignature] = useState('0x9a8f23...signed_custody_receipt');

  const [report, setReport] = useState<CompletenessReport | null>(null);

  const handleEvaluate = (e: React.FormEvent) => {
    e.preventDefault();
    const data: HandoverEvidenceData = {
      shipmentId,
      lotId,
      senderAddress,
      receiverAddress,
      vehicleCarrierRef,
      sealId,
      dispatchQty: parseFloat(dispatchQty) || 0,
      receiptQty: parseFloat(receiptQty) || 0,
      weighmentSlipRef,
      inspectionPassed,
      moisturePercentage: parseFloat(moisturePercentage) || 0,
      pestFree,
      receiverSignature,
    };
    const res = calculateEvidenceCompleteness(data);
    setReport(res);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Physical-to-Digital Evidence Completeness ($C_e$) (G3)
              </CardTitle>
              <CardDescription>
                Implements Equation (13): C_e = (1 / m) &Sigma; 1[f_k present and valid]. Verifies tamper-evident seals, weighbridge calibration, moisture limits, and receiver signature.
              </CardDescription>
            </div>
            <Badge variant="outline">Eq (13) Model</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEvaluate} className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Shipment ID</Label>
              <Input className="mt-1" value={shipmentId} onChange={e => setShipmentId(e.target.value)} />
            </div>

            <div>
              <Label>Lot Identifier</Label>
              <Input className="mt-1" value={lotId} onChange={e => setLotId(e.target.value)} />
            </div>

            <div>
              <Label>Vehicle / Carrier Reg #</Label>
              <Input
                className="mt-1"
                value={vehicleCarrierRef}
                onChange={e => setVehicleCarrierRef(e.target.value)}
              />
            </div>

            <div>
              <Label>Tamper-Evident Seal ID</Label>
              <Input className="mt-1" value={sealId} onChange={e => setSealId(e.target.value)} />
            </div>

            <div>
              <Label>Dispatch Qty (kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1"
                value={dispatchQty}
                onChange={e => setDispatchQty(e.target.value)}
              />
            </div>

            <div>
              <Label>Receipt Qty (kg)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1"
                value={receiptQty}
                onChange={e => setReceiptQty(e.target.value)}
              />
            </div>

            <div>
              <Label>Weighbridge Calibrated Slip Ref</Label>
              <Input
                className="mt-1"
                value={weighmentSlipRef}
                onChange={e => setWeighmentSlipRef(e.target.value)}
              />
            </div>

            <div>
              <Label>Moisture Content (%) (Safe: 8-14%)</Label>
              <Input
                type="number"
                step="0.1"
                className="mt-1"
                value={moisturePercentage}
                onChange={e => setMoisturePercentage(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={inspectionPassed}
                  onChange={e => setInspectionPassed(e.target.checked)}
                />
                Inspection Certificate
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={pestFree}
                  onChange={e => setPestFree(e.target.checked)}
                />
                Pest / Hygiene Free
              </label>
            </div>

            <div className="md:col-span-3">
              <Label>Receiver Handover Signature</Label>
              <Input
                className="mt-1 font-mono text-xs"
                value={receiverSignature}
                onChange={e => setReceiverSignature(e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <Button type="submit" className="w-full">
                Calculate Handover Evidence Completeness $C_e$
              </Button>
            </div>
          </form>

          {report && (
            <div className="mt-6 rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold">Evidence Completeness Score $C_e$</h4>
                  <p className="text-xs text-muted-foreground">
                    {report.validFields} of {report.totalFields} mandatory physical evidence criteria verified
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-bold text-primary">
                    {(report.score * 100).toFixed(1)}%
                  </span>
                  <div>
                    <Badge variant={report.isCompliant ? 'default' : 'destructive'}>
                      {report.isCompliant ? 'COMPLIANT' : 'DEFICIENT EVIDENCE'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Progress value={report.score * 100} className="h-2" />

              <div className="grid gap-2 text-xs md:grid-cols-3">
                {Object.entries(report.fieldResults).map(([key, res]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded bg-muted/40 p-2"
                  >
                    <span className="font-mono">{key}</span>
                    {res.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
