import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPdsLot, getPdsLotEvents } from '@/lib/blockchain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowUpRight, Blocks, ShieldCheck } from 'lucide-react';

const explorerBase = ((import.meta as any)?.env?.VITE_EXPLORER_URL as string | undefined)?.replace(/\/$/, '');

const PDSLotDetails = () => {
  const { lotId = '' } = useParams<{ lotId: string }>();
  const [lot, setLot] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [lotData, eventData] = await Promise.all([getPdsLot(lotId), getPdsLotEvents(lotId)]);
        if (!active) return;
        setLot(lotData);
        setEvents(eventData);
      } catch (cause: any) {
        if (active) setError(cause?.message || 'Could not load this lot from Ethereum.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [lotId]);

  return (
    <main className="trace-shell container mx-auto max-w-4xl space-y-6 px-4 py-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Public Ethereum lot record</p>
        <h1 className="mt-2 text-3xl font-bold">Food commodity trace</h1>
        <p className="mt-2 break-all font-mono text-sm text-muted-foreground">Lot ID: {lotId}</p>
      </header>
      {loading && <Card><CardContent className="space-y-3 p-6"><Skeleton className="h-7 w-1/3" /><Skeleton className="h-4 w-3/4" /></CardContent></Card>}
      {error && <Alert variant="destructive"><AlertTitle>Unable to verify this lot</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {!loading && !error && lot && <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-trust-green" />Read directly from the configured Ethereum contract</CardTitle>
            <CardDescription>On-chain state and event history are public. Commodity quality and physical facts still rely on accountable inspections and evidence.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2">
            <div><span className="text-muted-foreground">Commodity code</span><p className="break-all font-mono">{lot.commodityCode}</p></div>
            <div><span className="text-muted-foreground">Quantity / unit code</span><p>{lot.quantity} / <span className="font-mono">{lot.unitCode}</span></p></div>
            <div><span className="text-muted-foreground">Current custodian</span><p className="break-all font-mono">{lot.custodian}</p></div>
            <div><span className="text-muted-foreground">State</span><p><Badge variant="secondary">{['None','Registered','In transit','At warehouse','Allocated','Depleted','Recalled'][lot.status] || 'Unknown'}</Badge></p></div>
            <div className="md:col-span-2"><span className="text-muted-foreground">Record commitment</span><p className="break-all font-mono text-xs">{lot.dataHash}</p></div>
            <div><span className="text-muted-foreground">Originator</span><p className="break-all font-mono">{lot.originator}</p></div>
            <div><span className="text-muted-foreground">Registered</span><p>{new Date(lot.createdAt * 1000).toLocaleString()}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Blocks className="h-5 w-5" />On-chain event history</CardTitle><CardDescription>Events are read from the configured public RPC and ordered by block.</CardDescription></CardHeader>
          <CardContent>
            {events.length === 0 ? <p className="text-sm text-muted-foreground">No indexed events were returned for this lot.</p> : <ol className="space-y-4 border-l pl-5">
              {events.map((event, index) => <li key={`${event.transactionHash}-${index}`} className="space-y-1">
                <p className="font-semibold">{event.event}</p>
                <p className="text-xs text-muted-foreground">Block {event.blockNumber} · {event.transactionHash}</p>
                <pre className="overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(event.args, null, 2)}</pre>
                {explorerBase && <a className="inline-flex items-center gap-1 text-xs text-primary" href={`${explorerBase}/tx/${event.transactionHash}`} target="_blank" rel="noreferrer">View transaction <ArrowUpRight className="h-3 w-3" /></a>}
              </li>)}
            </ol>}
          </CardContent>
        </Card>
      </>}
      <Button variant="outline" asChild><Link to="/">Back to HarvestLink</Link></Button>
    </main>
  );
};

export default PDSLotDetails;
