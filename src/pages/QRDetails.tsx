import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCheck, MapPin, Calendar, Store, Truck, IndianRupee, Star, User } from 'lucide-react';
import { getBatch, getProduct, getProductStatus, verifyProduct, generateQRCodeDataURL } from '@/lib/blockchain';
import { useBlockchain } from '@/hooks/useBlockchain';

type RouteParams = {
  '*': string;
  id?: string;
  unique?: string;
};

export default function QRDetails() {
  const params = useParams<RouteParams>();
  // Support both /p/:id/:unique and /b/:id/:unique mounted paths
  const path = params['*'] || '';
  const isProduct = useMemo(() => path.startsWith('p'), [path]);
  const idParam = params.id || (path.split('/')[1] || '');
  const unique = params.unique || (path.split('/')[2] || '');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productData, setProductData] = useState<any | null>(null);
  const [batchData, setBatchData] = useState<any | null>(null);
  const [supabaseData, setSupabaseData] = useState<any | null>(null);
  const { verifyQR } = useBlockchain();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isProduct) {
          const id = parseInt(idParam || '');
          if (!id || Number.isNaN(id)) throw new Error('Invalid product QR');
          const { product, owners } = await verifyProduct(id);
          setProductData({ product, owners });
        } else {
          // Public batch QR (Supabase-backed). Use the full URL as the QR string
          const qrUrl = window.location.href;
          const data = await verifyQR(qrUrl);
          setSupabaseData(data);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isProduct, idParam, unique]);

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );

  const Row: React.FC<{ label: string; value?: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex items-start gap-2">
      {icon}
      <div>
        <div className="text-muted-foreground">{label}</div>
        <div className="text-foreground font-medium break-words">{value ?? '-'}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isProduct ? 'Product QR Details' : 'Batch QR Details'}</span>
              <Badge variant="secondary" className="uppercase">{unique ? 'public' : 'local'}</Badge>
            </CardTitle>
            <CardDescription>
              Trusted traceability for crops via blockchain. Shareable public link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading && (
              <div className="space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Cannot load details</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!loading && !error && (
              <div className="space-y-6">
                {/* Essential QR Code Details (Public-facing) */}
                <Section title="Essential QR Code Details (Public-facing)">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Farmer Smart Contract */}
                    <div className="md:col-span-2">
                      <h4 className="font-medium mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-trust-green" /> From Farmer Smart Contract</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Row label="Farmer ID" value={supabaseData?.farmer?.id || productData?.product?.farmer || '—'} icon={<User className="w-4 h-4 text-farm-primary" />} />
                        <Row label="Farmer Name" value={supabaseData ? supabaseData.farmer?.name : (productData?.product?.farmerName || '—')} />
                        <Row label="Location" value={supabaseData ? supabaseData.farmer?.location : (productData?.product?.farmerLocation || '—')} icon={<MapPin className="w-4 h-4 text-farm-primary" />} />
                        <Row label="Crop type" value={supabaseData ? supabaseData.product?.name : (productData?.product?.name || '—')} />
                        <Row label="Variety & Grade" value={supabaseData ? `${supabaseData.product?.variety || '—'} ${supabaseData.product?.grade ? '(' + supabaseData.product.grade + ')' : ''}` : (productData?.product?.grade || '—')} />
                        <Row label="Cultivation & Harvest date" value={supabaseData ? supabaseData.product?.harvestDate : (productData ? new Date(productData.product.createdAt * 1000).toLocaleDateString() : '—')} icon={<Calendar className="w-4 h-4 text-harvest-amber" />} />
                        <Row label="Certification info" value={supabaseData ? (supabaseData.product?.certifications || []).join(', ') : ((productData?.product?.certificates || []).join(', ') || '—')} />
                        <Row label="Quantity produced (batch size)" value={supabaseData ? supabaseData.product?.quantity : (batchData ? `${batchData.productIds?.length || 0} units` : '—')} />
                      </div>
                    </div>

                    {/* Distributor Smart Contract */}
                    <div className="md:col-span-2">
                      <h4 className="font-medium mb-2">From Distributor Smart Contract</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Row label="Distributor Organization / ID" value={supabaseData ? supabaseData.assignment?.data?.distributor_name || supabaseData.assignment?.data?.distributor_id : (batchData?.currentHandler || productData?.owners?.[productData?.owners?.length - 1])} />
                        <Row label="Warehouse / Storage location" value={supabaseData ? supabaseData.batch?.status : (batchData?.location || '—')} />
                        <Row label="Quality check / Packaging status" value={supabaseData ? (supabaseData.verification?.blockchainVerified ? 'Verified' : 'Pending') : (isProduct ? getProductStatus(productData?.product?.status ?? 0) : getProductStatus(batchData?.status ?? 0))} />
                        <Row label="Dispatch date & transportation info" value={supabaseData ? supabaseData.assignment?.data?.vehicle_code || supabaseData.assignment?.data?.route || '—' : '—'} icon={<Truck className="w-4 h-4 text-blockchain-blue" />} />
                      </div>
                    </div>

                    {/* Retailer Smart Contract */}
                    <div className="md:col-span-2">
                      <h4 className="font-medium mb-2">From Retailer Smart Contract</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Row label="Retailer / Shop name" value={supabaseData?.retailer?.name || '—'} icon={<Store className="w-4 h-4" />} />
                        <Row label="Store location" value={supabaseData?.retailer?.location || '—'} icon={<MapPin className="w-4 h-4" />} />
                        <Row label="Selling price (per unit)" value={supabaseData ? supabaseData.product?.pricePerUnit : (isProduct ? `${productData?.product?.price ?? '—'} ETH` : '—')} icon={<IndianRupee className="w-4 h-4" />} />
                        <Row label="Packaging / Branding details" value={supabaseData?.retailer?.branding || '—'} />
                      </div>
                    </div>

                    {/* Customer Smart Contract */}
                    <div className="md:col-span-2">
                      <h4 className="font-medium mb-2">From Customer Smart Contract</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Row label="Purchase date & time" value={supabaseData?.transactions?.[0]?.created_at || '—'} />
                        <Row label="Feedback / Rating" value={supabaseData?.reviews?.[0]?.rating ? `${supabaseData.reviews[0].rating}/5` : '—'} icon={<Star className="w-4 h-4 text-yellow-500" />} />
                      </div>
                    </div>
                  </div>
                </Section>

                <Separator />

                <div className="text-xs text-muted-foreground">
                  QR: {isProduct ? 'Product' : 'Batch'} • URL: {typeof window !== 'undefined' ? window.location.href : ''}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


