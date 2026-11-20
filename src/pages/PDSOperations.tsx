import { FormEvent, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import {
  allocatePdsStock,
  generatePdsEntitlementSecret,
  getPdsLot,
  issuePdsEntitlement,
  receivePdsStock,
  redeemPdsAllocation,
  recallPdsLot,
  setPdsOperatorRole,
  splitPdsLot,
  generatePdsLotQRCode,
  transferPdsCustody,
} from '@/lib/blockchain';
import { AlertTriangle, ArrowLeftRight, Boxes, ClipboardCheck, KeyRound, Loader2, PackageCheck, Search, ShieldAlert, Scale, WifiOff, FileCheck, BrainCircuit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { ReconciliationTab } from '@/components/pds/ReconciliationTab';
import { OfflineQueueTab } from '@/components/pds/OfflineQueueTab';
import { EvidenceTab } from '@/components/pds/EvidenceTab';
import { GatAnalyticsTab } from '@/components/pds/GatAnalyticsTab';

const digest = (action: string, value: Record<string, unknown>) =>
  ethers.sha256(ethers.toUtf8Bytes(JSON.stringify({ schema: 'harvestlink.pds.action.v1', action, ...value })));

const PDSOperations = () => {
  const { profile, userRole } = useAuth();
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [lotId, setLotId] = useState('');
  const [destination, setDestination] = useState('');
  const [facilityCode, setFacilityCode] = useState('');
  const [allocationId, setAllocationId] = useState('');
  const [outlet, setOutlet] = useState('');
  const [quantity, setQuantity] = useState('');
  const [period, setPeriod] = useState('');
  const [secret, setSecret] = useState('');
  const [lotView, setLotView] = useState<any>(null);
  const [roleRequests, setRoleRequests] = useState<any[]>([]);
  const [operatorWallet, setOperatorWallet] = useState('');
  const [operatorRole, setOperatorRole] = useState('FARMER_ROLE');
  const [splitQuantity, setSplitQuantity] = useState('');
  const [childLotId, setChildLotId] = useState('');
  const [childQr, setChildQr] = useState('');
  const [showChildQr, setShowChildQr] = useState(false);

  const loadRoleRequests = async () => {
    const { data, error } = await supabase.functions.invoke('role-requests', { body: {} });
    if (error) throw error;
    setRoleRequests((data as any)?.requests || []);
  };

  useEffect(() => {
    if (userRole === UserRole.ADMIN) void loadRoleRequests().catch((error) => {
      console.error('Could not load role requests:', error);
    });
  }, [userRole]);

  const execute = async (label: string, operation: () => Promise<string>) => {
    setBusy(true);
    try {
      const hash = await operation();
      setTxHash(hash);
      toast({ title: `${label} confirmed`, description: `Transaction: ${hash.slice(0, 14)}…` });
    } catch (error: any) {
      toast({ title: `${label} failed`, description: error?.shortMessage || error?.message || 'Transaction failed', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const submit = (fn: () => Promise<void>) => (event: FormEvent) => {
    event.preventDefault();
    void fn();
  };

  const allowed = [UserRole.FARMER, UserRole.DISTRIBUTOR, UserRole.RETAILER, UserRole.PROCUREMENT, UserRole.WAREHOUSE, UserRole.TRANSPORTER, UserRole.AUDITOR, UserRole.ADMIN].includes(userRole as UserRole);
  if (!allowed) {
    return <main className="container mx-auto max-w-3xl px-4 py-12"><Card><CardHeader><CardTitle>Operator access required</CardTitle><CardDescription>This page is for authorized supply chain operators.</CardDescription></CardHeader></Card></main>;
  }

  return (
    <main className="trace-shell container mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Ethereum PDS operations</p>
        <h1 className="mt-2 text-3xl font-bold">Commodity custody and distribution</h1>
        <p className="mt-2 text-muted-foreground">Actions below call the configured HarvestLink contract from your wallet. The contract enforces operator roles and records public events.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" />Connected operator</CardTitle>
          <CardDescription>{profile?.first_name} {profile?.last_name} · {userRole || 'unknown role'}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Wallet role membership is checked by the smart contract. A signed-in application account alone cannot authorize an Ethereum action.</CardContent>
      </Card>

      {userRole === UserRole.ADMIN && <Card><CardHeader><CardTitle>Operator access administration</CardTitle><CardDescription>Application access and Ethereum wallet roles are separate approvals. Grant only the role required for each operator.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <h2 className="font-semibold">Application role requests</h2>
            {roleRequests.length === 0 && <p className="text-sm text-muted-foreground">No pending role requests.</p>}
            {roleRequests.map((request) => <div key={request.id} className="flex flex-col gap-2 rounded border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-medium">{request.first_name} {request.last_name} · {request.requested_role}</p><p className="text-xs text-muted-foreground">{request.email} · profile {request.id}</p><p className="break-all text-xs text-muted-foreground">Wallet: {request.wallet_address || 'not linked yet'}</p></div>
              <Button disabled={busy} onClick={async () => {
                setBusy(true);
                try {
                  const { error } = await supabase.functions.invoke('approve-role', { body: { profileId: request.id, role: request.requested_role } });
                  if (error) throw error;
                  await loadRoleRequests();
                  toast({ title: 'Application role approved', description: `${request.requested_role} access granted. Grant the matching contract role separately.` });
                } catch (error: any) { toast({ title: 'Role approval failed', description: error?.message, variant: 'destructive' }); }
                finally { setBusy(false); }
              }}>Approve application role</Button>
            </div>)}
          </section>
          <section className="grid gap-3 border-t pt-4 md:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-2"><Label>Operator wallet</Label><Input value={operatorWallet} onChange={e => setOperatorWallet(e.target.value)} placeholder="0x…" /></div>
            <div className="space-y-2"><Label>Contract role</Label><select className="h-10 rounded-md border bg-background px-3 text-sm" value={operatorRole} onChange={e => setOperatorRole(e.target.value)}>
              {['FARMER_ROLE','PROCUREMENT_ROLE','WAREHOUSE_ROLE','TRANSPORTER_ROLE','DISTRIBUTOR_ROLE','RETAILER_ROLE','AUDITOR_ROLE'].map(role => <option key={role} value={role}>{role.replace('_ROLE','').toLowerCase()}</option>)}
            </select></div>
            <div className="flex gap-2 self-end">
              <Button disabled={busy || !operatorWallet} onClick={() => void execute('Contract role grant', () => setPdsOperatorRole(operatorRole, operatorWallet, true))}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Grant</Button>
              <Button variant="outline" disabled={busy || !operatorWallet} onClick={() => void execute('Contract role revocation', () => setPdsOperatorRole(operatorRole, operatorWallet, false))}>Revoke</Button>
            </div>
          </section>
        </CardContent>
      </Card>}

      <Tabs defaultValue="custody">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 md:grid-cols-9">
          <TabsTrigger value="custody">Custody</TabsTrigger>
          <TabsTrigger value="warehouse">Warehouse</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="redemption">Redemption</TabsTrigger>
          <TabsTrigger value="verify">Verify/Recall</TabsTrigger>
          <TabsTrigger value="reconciliation" className="flex items-center gap-1">
            <Scale className="h-3.5 w-3.5" /> Recon (G1)
          </TabsTrigger>
          <TabsTrigger value="offline" className="flex items-center gap-1">
            <WifiOff className="h-3.5 w-3.5" /> Offline (G2)
          </TabsTrigger>
          <TabsTrigger value="evidence" className="flex items-center gap-1">
            <FileCheck className="h-3.5 w-3.5" /> Evidence (G3)
          </TabsTrigger>
          <TabsTrigger value="gat" className="flex items-center gap-1">
            <BrainCircuit className="h-3.5 w-3.5" /> GAT AI (VI)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="custody">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><ArrowLeftRight className="h-5 w-5" />Transfer lot custody</CardTitle><CardDescription>Transfer the full current lot to an authorized wallet. Split the lot on chain before a partial transfer.</CardDescription></CardHeader>
            <CardContent><form className="grid gap-4 md:grid-cols-2" onSubmit={submit(async () => {
              const details = { lotId, destination: ethers.getAddress(destination) };
              await execute('Custody transfer', () => transferPdsCustody(lotId, destination, digest('custody-transfer', details)));
            })}>
              <div className="space-y-2"><Label>Lot ID (UUID or bytes32)</Label><Input required value={lotId} onChange={e => setLotId(e.target.value)} placeholder="Batch UUID from the QR page" /></div>
              <div className="space-y-2"><Label>Recipient wallet</Label><Input required value={destination} onChange={e => setDestination(e.target.value)} placeholder="0x…" /></div>
              <Button className="md:col-span-2" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Transfer custody on Ethereum</Button>
            </form></CardContent>
          </Card>
          <Card className="mt-4"><CardHeader><CardTitle>Split a lot</CardTitle><CardDescription>Creates a child lot and subtracts its quantity from the parent in one Ethereum transaction.</CardDescription></CardHeader>
            <CardContent><form className="grid gap-4 md:grid-cols-2" onSubmit={submit(async () => {
              const newChildId = crypto.randomUUID();
              const details = { parentId: lotId, childId: newChildId, quantity: splitQuantity };
              await execute('Lot split', async () => {
                const hash = await splitPdsLot(lotId, newChildId, splitQuantity, digest('lot-split', details));
                setChildLotId(newChildId);
                setChildQr(generatePdsLotQRCode(newChildId));
                return hash;
              });
            })}>
              <div className="space-y-2"><Label>Parent lot ID</Label><Input required value={lotId} onChange={e => setLotId(e.target.value)} /></div>
              <div className="space-y-2"><Label>Child quantity</Label><Input required type="number" min="0.001" step="0.001" value={splitQuantity} onChange={e => setSplitQuantity(e.target.value)} /></div>
              <Button className="md:col-span-2" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Split stock and create traceable child lot</Button>
            </form>
            {childLotId && <Button className="mt-4" variant="outline" onClick={() => setShowChildQr(true)}>Show child lot QR</Button>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warehouse">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5" />Receive stock</CardTitle><CardDescription>The connected wallet must hold the lot and have the warehouse operator role.</CardDescription></CardHeader>
            <CardContent><form className="grid gap-4 md:grid-cols-2" onSubmit={submit(async () => {
              const details = { lotId, facilityCode };
              await execute('Stock receipt', () => receivePdsStock(lotId, facilityCode, digest('stock-received', details)));
            })}>
              <div className="space-y-2"><Label>Lot ID</Label><Input required value={lotId} onChange={e => setLotId(e.target.value)} /></div>
              <div className="space-y-2"><Label>Public facility code</Label><Input required value={facilityCode} onChange={e => setFacilityCode(e.target.value)} placeholder="Warehouse code, no private address" /></div>
              <Button className="md:col-span-2" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm warehouse receipt</Button>
            </form></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5" />Allocate stock and issue an entitlement</CardTitle><CardDescription>Allocation reduces the lot balance. Issue each entitlement using a random secret; deliver the secret privately to its eligible holder.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <form className="grid gap-4 md:grid-cols-2" onSubmit={submit(async () => {
                const newAllocationId = crypto.randomUUID();
                const details = { lotId, outlet: ethers.getAddress(outlet), quantity, period };
                await execute('PDS allocation', async () => {
                  const hash = await allocatePdsStock({ allocationId: newAllocationId, lotId, outlet, quantity, period, dataHash: digest('allocation', details) });
                  setAllocationId(newAllocationId);
                  return hash;
                });
              })}>
                <div className="space-y-2"><Label>Lot ID</Label><Input required value={lotId} onChange={e => setLotId(e.target.value)} /></div>
                <div className="space-y-2"><Label>Distribution outlet wallet</Label><Input required value={outlet} onChange={e => setOutlet(e.target.value)} placeholder="0x…" /></div>
                <div className="space-y-2"><Label>Quantity (up to 3 decimal places)</Label><Input required type="number" min="0.001" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                <div className="space-y-2"><Label>Period code</Label><Input required value={period} onChange={e => setPeriod(e.target.value)} placeholder="e.g. 2026-11" /></div>
                <Button className="md:col-span-2" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record stock allocation</Button>
              </form>
              {allocationId && <div className="space-y-3 rounded-lg border p-4"><p className="break-all text-sm"><strong>Allocation ID:</strong> {allocationId}</p>
                <Button disabled={busy} variant="outline" onClick={() => {
                  const generated = generatePdsEntitlementSecret();
                  setSecret(generated);
                  void execute('Entitlement issuance', () => issuePdsEntitlement(allocationId, generated));
                }}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Issue private entitlement</Button>
                {secret && <div className="space-y-2 rounded bg-muted p-3 text-xs"><p className="break-all"><strong>Private beneficiary secret — deliver securely and do not publish:</strong><br />{secret}</p><Button type="button" size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(secret); toast({ title: 'Secret copied', description: 'Deliver it to the eligible holder using a private channel.' }); }}>Copy private secret</Button></div>}
              </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="redemption">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />Record final distribution</CardTitle><CardDescription>The outlet submits the beneficiary’s one-time secret. The contract checks issuance, allocation, outlet role, balance, and replay.</CardDescription></CardHeader>
            <CardContent><form className="grid gap-4 md:grid-cols-2" onSubmit={submit(async () => {
              const details = { allocationId, quantity };
              await execute('Distribution', () => redeemPdsAllocation({ allocationId, secret, quantity, dataHash: digest('distribution', details) }));
              setSecret('');
            })}>
              <div className="space-y-2"><Label>Allocation ID</Label><Input required value={allocationId} onChange={e => setAllocationId(e.target.value)} /></div>
              <div className="space-y-2"><Label>Quantity issued</Label><Input required type="number" min="0.001" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
              <div className="space-y-2 md:col-span-2"><Label>One-time beneficiary secret</Label><Input required value={secret} onChange={e => setSecret(e.target.value)} autoComplete="off" /></div>
              <Button className="md:col-span-2" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record distribution on Ethereum</Button>
            </form></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verify">
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Read a lot from chain</CardTitle><CardDescription>Reads the contract state from the configured RPC.</CardDescription></CardHeader>
              <CardContent className="space-y-3"><div className="space-y-2"><Label>Lot ID</Label><Input value={lotId} onChange={e => setLotId(e.target.value)} /></div><Button disabled={busy || !lotId} variant="outline" onClick={async () => {
                setBusy(true);
                try { setLotView(await getPdsLot(lotId)); } catch (error: any) { toast({ title: 'Lot lookup failed', description: error?.message, variant: 'destructive' }); }
                finally { setBusy(false); }
              }}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Read on-chain lot</Button>
                {lotView && <pre className="overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(lotView, null, 2)}</pre>}
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Recall a lot</CardTitle><CardDescription>Auditor role required. Use a hash of the reason; never place personal details on chain.</CardDescription></CardHeader>
              <CardContent><Button variant="destructive" disabled={busy || !lotId} onClick={() => {
                const reasonHash = digest('recall', { lotId, reason: 'operator recall' });
                void execute('Lot recall', () => recallPdsLot(lotId, reasonHash));
              }}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Recall lot on chain</Button></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reconciliation">
          <ReconciliationTab />
        </TabsContent>

        <TabsContent value="offline">
          <OfflineQueueTab />
        </TabsContent>

        <TabsContent value="evidence">
          <EvidenceTab />
        </TabsContent>

        <TabsContent value="gat">
          <GatAnalyticsTab />
        </TabsContent>
      </Tabs>

      {txHash && <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Latest confirmed transaction</CardTitle><CardDescription className="break-all font-mono">{txHash}</CardDescription></CardHeader></Card>}
      <QRCodeGenerator data={childQr} title="PDS child lot QR" description="Scan to read this lot directly from the configured Ethereum contract." showDialog={showChildQr} onClose={() => setShowChildQr(false)} />
    </main>
  );
};

export default PDSOperations;
