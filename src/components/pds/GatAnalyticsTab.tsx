import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  generateSyntheticSupplyChainDataset,
  runEdgeAwareGAT,
  evaluateModelBaselines,
  SupplyChainNode,
  SupplyChainEdge,
  AnomalyPrediction,
  BenchmarkMetrics,
} from '@/lib/gatAnomalyEngine';
import { BrainCircuit, Play, Network, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const GatAnalyticsTab: React.FC = () => {
  const [nodes, setNodes] = useState<SupplyChainNode[]>([]);
  const [edges, setEdges] = useState<SupplyChainEdge[]>([]);
  const [predictions, setPredictions] = useState<AnomalyPrediction[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkMetrics[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<AnomalyPrediction | null>(null);
  const [decisionThreshold, setDecisionThreshold] = useState<number>(0.55);

  const loadData = () => {
    const data = generateSyntheticSupplyChainDataset(25);
    setNodes(data.nodes);
    setEdges(data.edges);

    const preds = runEdgeAwareGAT(data.nodes, data.edges, decisionThreshold);
    setPredictions(preds);

    const bms = evaluateModelBaselines(data.edges);
    setBenchmarks(bms);

    if (preds.length > 0) {
      setSelectedPrediction(preds[0]);
    }
  };

  useEffect(() => {
    loadData();
  }, [decisionThreshold]);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                Edge-Aware Graph Attention Network (GAT) Anomaly Prioritisation (Section VI)
              </CardTitle>
              <CardDescription>
                Learns multi-hop relational dependencies over the supply chain transfer graph G_t = (V, E_t, X_t, Z_t) (Eq 14). Specifically detects distributed sub-tolerance skimming (A7) and collusive entity pairs (A8) where deterministic local rules fail.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Threshold &theta;*:</span>
              <select
                className="h-8 rounded border bg-background px-2 text-xs"
                value={decisionThreshold}
                onChange={e => setDecisionThreshold(parseFloat(e.target.value))}
              >
                <option value="0.45">0.45 (High Recall)</option>
                <option value="0.55">0.55 (Balanced F1*)</option>
                <option value="0.70">0.70 (Low False Alert)</option>
              </select>
              <Button size="sm" onClick={loadData}>
                <Play className="mr-1 h-3 w-3" /> Re-run Graph Pass
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Supply Chain Graph Nodes |V|</p>
              <p className="text-2xl font-bold">{nodes.length}</p>
              <p className="text-[11px] text-muted-foreground">Depots, Warehouses, Outlets</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Attributed Transfers |E|</p>
              <p className="text-2xl font-bold">{edges.length}</p>
              <p className="text-[11px] text-muted-foreground">Directed custody handovers</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Flagged for Human Review (Eq 27)</p>
              <p className="text-2xl font-bold text-amber-500">
                {predictions.filter(p => p.decision === 'REVIEW').length}
              </p>
              <p className="text-[11px] text-muted-foreground">Prioritised by GAT score p_ij</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Contract-Invalid Violations</p>
              <p className="text-2xl font-bold text-destructive">
                {predictions.filter(p => p.decision === 'REJECT').length}
              </p>
              <p className="text-[11px] text-muted-foreground">Hard deterministic contract reverts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Predictions List + Attention Inspection */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Ranked Transfers List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Prioritised Transfers (Ranked by Anomaly Risk p_ij)</CardTitle>
            <CardDescription className="text-xs">
              Hybrid Decision Rule (Eq 27): REJECT if C(e)=0; REVIEW if C(e)=1 and (a_rule=1 or p_e &ge; &theta;*); ACCEPT otherwise.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {predictions
                .slice()
                .sort((a, b) => b.anomalyProbability - a.anomalyProbability)
                .map(pred => (
                  <div
                    key={pred.transferId}
                    onClick={() => setSelectedPrediction(pred)}
                    className={`cursor-pointer rounded-lg border p-3 text-xs transition-colors ${
                      selectedPrediction?.transferId === pred.transferId
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{pred.transferId}</span>
                        <span className="text-muted-foreground">
                          {pred.sourceId} &rarr; {pred.targetId}
                        </span>
                        {pred.flaggedFamilies.map(fam => (
                          <Badge key={fam} variant="outline" className="text-[10px]">
                            {fam}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">
                          {(pred.anomalyProbability * 100).toFixed(1)}%
                        </span>
                        <Badge
                          variant={
                            pred.decision === 'REJECT'
                              ? 'destructive'
                              : pred.decision === 'REVIEW'
                              ? 'secondary'
                              : 'default'
                          }
                        >
                          {pred.decision}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Attention & Rationale Inspection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />
              Graph Attention Rationale
            </CardTitle>
            <CardDescription className="text-xs">
              Multi-head attention weights alpha_ij explaining model decision.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedPrediction ? (
              <div className="space-y-3 text-xs">
                <div className="rounded bg-muted p-2">
                  <p className="font-semibold">{selectedPrediction.transferId}</p>
                  <p className="font-mono text-muted-foreground">Lot: {selectedPrediction.lotId}</p>
                  <p className="mt-1">
                    Risk Probability p_ij:{' '}
                    <span className="font-mono font-bold text-primary">
                      {(selectedPrediction.anomalyProbability * 100).toFixed(2)}%
                    </span>
                  </p>
                  <p>
                    Threshold &theta;*: <span className="font-mono">{selectedPrediction.decisionThreshold}</span>
                  </p>
                </div>

                <div>
                  <h5 className="font-semibold text-muted-foreground">Attention Edge Attribution:</h5>
                  <div className="mt-1 space-y-1">
                    {selectedPrediction.topAttentionEdges.map((edge, idx) => (
                      <div key={idx} className="rounded border bg-background p-2">
                        <div className="flex justify-between font-mono text-[11px]">
                          <span>{edge.edgeId}</span>
                          <span className="text-primary font-bold">
                            weight: {(edge.weight * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{edge.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded border p-2 bg-muted/20">
                  <span className="font-semibold">Human Review Action:</span>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Per Section VI-E, the model never autonomously punishes operators. Authorised auditors review the highlighted custody sequence before taking administrative action.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Select a transfer to view attention weights.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Model Baselines Comparison Table (Section IX-D) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Reproducible Empirical Baseline Comparison (Section IX-D, Table IV)
          </CardTitle>
          <CardDescription className="text-xs">
            Benchmarking deterministic quantity rules against linear, tree-based, and graph neural network baselines under identical synthetic leakage-safe splits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2">Model Baseline</th>
                  <th className="py-2">Precision</th>
                  <th className="py-2">Recall</th>
                  <th className="py-2">F1-Score</th>
                  <th className="py-2">PR-AUC</th>
                  <th className="py-2">FAR (False Alert Rate)</th>
                  <th className="py-2">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((bm, idx) => (
                  <tr
                    key={bm.modelName}
                    className={`border-b ${
                      bm.modelName.includes('Proposed')
                        ? 'bg-primary/5 font-bold text-primary'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    <td className="py-2 font-medium">{bm.modelName}</td>
                    <td className="py-2 font-mono">{(bm.precision * 100).toFixed(1)}%</td>
                    <td className="py-2 font-mono">{(bm.recall * 100).toFixed(1)}%</td>
                    <td className="py-2 font-mono">{(bm.f1Score * 100).toFixed(1)}%</td>
                    <td className="py-2 font-mono">{(bm.prAuc * 100).toFixed(1)}%</td>
                    <td className="py-2 font-mono">{(bm.falseAlertRate * 100).toFixed(1)}%</td>
                    <td className="py-2 font-mono">{(bm.accuracy * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            * Note: Edge-Aware GAT outperforms standard GCN/GAT by modeling continuous transfer edge attributes $z_{{ij}}$ (gap, duration, $C_e$), successfully uncovering distributed sub-tolerance skimming (A7) and collusive pair anomalies (A8).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
