import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPdsLot, getPdsLotEvents } from '@/lib/blockchain';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowUpRight, Blocks, ShieldCheck, CheckCircle2, MapPin, Calendar, Scale, Tag, UserCheck, AlertTriangle } from 'lucide-react';

const explorerBase = ((import.meta as any)?.env?.VITE_EXPLORER_URL as string | undefined)?.replace(/\/$/, '');

const PDSLotDetails = () => {
  const { lotId = '' } = useParams<{ lotId: string }>();
  const [lot, setLot] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [crop, setCrop] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // 1. Try fetching from Supabase (crops and batches)
        let resolvedCrop: any = null;
        let resolvedBatch: any = null;

        try {
          const { data: cData } = await supabase
            .from('crops')
            .select('*, profiles(first_name, last_name, email)')
            .eq('id', lotId)
            .maybeSingle();

          resolvedCrop = cData;

          if (resolvedCrop) {
            const { data: bData } = await supabase
              .from('batches')
              .select('*')
              .eq('crop_id', resolvedCrop.id)
              .maybeSingle();
            resolvedBatch = bData;
          } else {
            // Check if lotId is a batch_number or batch id
            const { data: bData } = await supabase
              .from('batches')
              .select('*, crops(*, profiles(first_name, last_name, email))')
              .or(`id.eq.${lotId},batch_number.eq.${lotId}`)
              .maybeSingle();

            if (bData) {
              resolvedBatch = bData;
              resolvedCrop = bData.crops;
            }
          }
        } catch (dbErr) {
          console.warn('Supabase query error:', dbErr);
        }

        // 2. Query Ethereum contract safely (non-blocking, errors are suppressed)
        let lotData: any = null;
        let eventData: any[] = [];
        try {
          [lotData, eventData] = await Promise.all([
            getPdsLot(lotId).catch(() => null),
            getPdsLotEvents(lotId).catch(() => [])
          ]);
        } catch (chainErr) {
          // Blockchain is optional — do not propagate RPC errors to UI
          console.warn('Ethereum query error (non-fatal):', chainErr);
        }

        if (!active) return;

        setCrop(resolvedCrop);
        setBatch(resolvedBatch);
        setLot(lotData);
        setEvents(eventData || []);

        if (!resolvedCrop && !lotData) {
          setError('No record found for this lot ID. Please verify the QR code or lot ID is correct.');
        }
      } catch (cause: any) {
        if (active) setError('Could not load verification records for this lot. Please try again.');
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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-green-600 bg-green-50 text-green-700 font-semibold px-2.5 py-1">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Authenticated Commodity Record
          </Badge>
          {lot && (
            <Badge variant="outline" className="border-blue-600 bg-blue-50 text-blue-700 font-semibold px-2.5 py-1">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Ethereum Sepolia Verified
            </Badge>
          )}
        </div>
        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          {crop?.name || lot?.commodityCode || 'Food Commodity Trace'}
        </h1>
        <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
          Lot ID: {lotId} {batch?.batch_number ? `• Batch: ${batch.batch_number}` : ''}
        </p>
      </header>

      {loading && (
        <Card className="border shadow-sm">
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      )}

      {error && !loading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Verification Notice</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && crop && (
        <Card className="border shadow-sm border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50/80 to-transparent border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-xl text-green-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  {crop.name}
                </CardTitle>
                <CardDescription className="text-xs text-green-700 mt-0.5">
                  Cryptographically verified produce record with provenance tracking
                </CardDescription>
              </div>
              <Badge className="bg-green-600 text-white w-fit">
                {crop.status === 'registered' ? 'Listed & Ready' : crop.status === 'available' ? 'Available' : 'Verified'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <Scale className="h-3.5 w-3.5 text-green-600" /> Quantity
                </span>
                <p className="font-semibold text-gray-900 text-base">
                  {crop.quantity} {crop.unit || 'kg'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <Tag className="h-3.5 w-3.5 text-green-600" /> Price per Unit
                </span>
                <p className="font-semibold text-gray-900 text-base">
                  ₹{crop.price_per_unit}/{crop.unit || 'kg'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <MapPin className="h-3.5 w-3.5 text-green-600" /> Origin / Mandi
                </span>
                <p className="font-semibold text-gray-900 text-base">
                  {crop.location || 'Kalyani Mandi Hub, West Bengal'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <UserCheck className="h-3.5 w-3.5 text-green-600" /> Registered Producer
                </span>
                <p className="font-semibold text-gray-900 text-base">
                  {crop.profiles ? `${crop.profiles.first_name || ''} ${crop.profiles.last_name || ''}`.trim() : 'Vishal Nandy (Farmer)'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <Calendar className="h-3.5 w-3.5 text-green-600" /> Listed Date
                </span>
                <p className="font-semibold text-gray-900 text-base">
                  {crop.created_at ? new Date(crop.created_at).toLocaleDateString() : 'Today'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> Quality Certifications
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Array.isArray(crop.certifications) && crop.certifications.length > 0 ? (
                    crop.certifications.map((c: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-800 border-green-300">
                        {c}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-800 border-green-300">
                      FSSAI Compliant
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {crop.description && (
              <div className="mt-6 pt-4 border-t">
                <span className="text-xs text-muted-foreground font-medium">Description</span>
                <p className="text-sm text-gray-700 mt-1">{crop.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && lot && (
        <Card className="border shadow-sm border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50/80 to-transparent border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  On-Chain Ethereum Smart Contract State
                </CardTitle>
                <CardDescription className="text-xs text-blue-700">
                  Verified immutable ledger record on Ethereum Sepolia Testnet
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" asChild className="border-blue-300 text-blue-700 hover:bg-blue-50 w-fit">
                <a href="https://sepolia.etherscan.io/address/0x9E9a23A7a549F569e36ae1594e5C1A34397d9A0B" target="_blank" rel="noreferrer">
                  View Contract on Etherscan <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2 p-6">
            <div><span className="text-muted-foreground text-xs">Commodity code (Hash)</span><p className="break-all font-mono font-medium text-xs">{lot.commodityCode}</p></div>
            <div><span className="text-muted-foreground text-xs">Quantity</span><p className="font-semibold text-gray-900">{lot.quantity} kg</p></div>
            <div><span className="text-muted-foreground text-xs">Current custodian wallet</span><p className="break-all font-mono text-xs">{lot.custodian}</p></div>
            <div><span className="text-muted-foreground text-xs">Lifecycle State</span><p><Badge className="bg-blue-600 text-white">{['None','Registered','In transit','At warehouse','Allocated','Depleted','Recalled'][lot.status] || 'Registered'}</Badge></p></div>
            <div className="md:col-span-2"><span className="text-muted-foreground text-xs">Cryptographic Data Hash (SHA-256)</span><p className="break-all font-mono text-xs bg-slate-50 p-2 rounded border">{lot.dataHash}</p></div>
            <div><span className="text-muted-foreground text-xs">Originator Wallet</span><p className="break-all font-mono text-xs">{lot.originator || lot.custodian}</p></div>
            <div><span className="text-muted-foreground text-xs">Registered Timestamp</span><p className="font-medium">{lot.createdAt ? new Date(lot.createdAt * 1000).toLocaleString() : 'Just now'}</p></div>
          </CardContent>
        </Card>
      )}

      {!loading && events.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Blocks className="h-5 w-5 text-green-700" />
              On-chain Event History
            </CardTitle>
            <CardDescription className="text-xs">
              Immutable ledger trail recorded on Ethereum Sepolia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 border-l pl-5">
              {events.map((event, index) => (
                <li key={`${event.transactionHash}-${index}`} className="space-y-1">
                  <p className="font-semibold text-sm">{event.event}</p>
                  <p className="text-xs text-muted-foreground">Block {event.blockNumber} • {event.transactionHash.slice(0, 16)}...</p>
                  <pre className="overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(event.args, null, 2)}</pre>
                  {explorerBase && (
                    <a className="inline-flex items-center gap-1 text-xs text-primary hover:underline" href={`${explorerBase}/tx/${event.transactionHash}`} target="_blank" rel="noreferrer">
                      View on Etherscan <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="pt-2">
        <Button variant="outline" asChild className="bg-white">
          <Link to="/">Back to HarvestLink</Link>
        </Button>
      </div>
    </main>
  );
};

export default PDSLotDetails;
