import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Package, TrendingUp, QrCode, Truck, BarChart3, DollarSign, ShieldCheck, Search, Loader2 } from 'lucide-react';
import { 
  blockchainService, 
  type Batch, 
  type Product,
  verifyProduct,
  updateBatchLocation,
  generateBatchQRCode,
  generateQRCodeDataURL,
  parseQRCodeData,
  getBatch
} from '@/lib/blockchain';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { LiveQRScannerModal } from '@/components/LiveQRScannerModal';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProduceItem {
  id: number;
  crop: string;
  farmer: string;
  quantity: string;
  harvestDate: string;
  quality: string;
  price: string;
  verified: boolean;
}

const DistributorDashboard = () => {
  const { user, profile, userRole, loading } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [currentProduce, setCurrentProduce] = useState<ProduceItem | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [availableProduce, setAvailableProduce] = useState<ProduceItem[]>([]);
  const [procuredProduce, setProcuredProduce] = useState<Array<{
    id: number;
    crop: string;
    farmer: string;
    quantity: string;
    purchaseDate: string;
    status: 'In Storage' | 'In Transit';
    destination: string;
  }>>([]);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    message: string;
    product?: Product;
    owners?: string[];
  } | null>(null);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [currentQRData, setCurrentQRData] = useState('');
  
  // Non-blocking dashboard initialization
  useEffect(() => {
    if (loading) return;

    const init = async () => {
      await loadDistributorData();
      await checkWalletConnection();
      await startRealtimeListeners();
      await loadBatchesFromChain().catch(() => {});
    };

    init();

    return () => {
      try { blockchainService.stopEventListeners(); } catch (_) {}
    };
  }, [loading]);

  const loadDistributorData = async () => {
    try {
      setIsLoading(true);
      // Fetch available crops/produce from Supabase
      const { data: cropsData, error } = await supabase
        .from('crops')
        .select(`
          id, name, quantity, unit, price_per_unit, status, created_at, location,
          farmer:farmer_id (first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (cropsData && cropsData.length > 0) {
        const available: any[] = cropsData
          .filter((c: any) => c.status === 'registered' || c.status === 'available')
          .map((c: any, index: number) => ({
            id: index + 1,
            cropId: c.id,
            crop: c.name,
            farmer: c.farmer ? `${c.farmer.first_name || ''} ${c.farmer.last_name || ''}`.trim() : 'Registered Mandi Farmer',
            quantity: `${c.quantity} ${c.unit || 'kg'}`,
            harvestDate: c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recent',
            quality: 'Grade A Certified',
            price: `₹${c.price_per_unit}/kg`,
            verified: true,
          }));
        setAvailableProduce(available);

        const procured: any[] = cropsData
          .filter((c: any) => c.status === 'processing' || c.status === 'in_transit' || c.status === 'sold')
          .map((c: any, index: number) => ({
            id: index + 1,
            cropId: c.id,
            crop: c.name,
            farmer: c.farmer ? `${c.farmer.first_name || ''} ${c.farmer.last_name || ''}`.trim() : 'Registered Mandi Farmer',
            quantity: `${c.quantity} ${c.unit || 'kg'}`,
            purchaseDate: c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recent',
            status: c.status === 'in_transit' ? ('In Transit' as const) : ('In Storage' as const),
            destination: c.location || 'FPS Central Hub',
          }));
        setProcuredProduce(procured);
      }
    } catch (e) {
      console.error('Error loading distributor data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Check wallet connection
  const checkWalletConnection = async () => {
    try {
      const account = await blockchainService.getCurrentAccount();
      setWalletConnected(!!account);
    } catch (error) {
      console.error('Error checking wallet connection:', error);
      setWalletConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      await blockchainService.connectWallet();
      setWalletConnected(true);
      toast({
        title: 'Wallet Connected',
        description: 'Your wallet has been connected successfully',
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect wallet',
        variant: 'destructive',
      });
    }
  };

  // Load all batches from the blockchain (Sepolia/Hardhat via MetaMask)
  const loadBatchesFromChain = async () => {
    try {
      setIsLoading(true);
      const count = await (blockchainService as any).getBatchCount();
      const list: Batch[] = [];
      for (let i = 1; i <= Number(count); i++) {
        try {
          const b = await getBatch(i);
          // Show only active/non-empty batches
          if (Array.isArray(b.productIds) && b.productIds.length > 0) {
            list.push(b);
          }
        } catch { /* skip holes */ }
      }
      setBatches(list);
    } catch (error) {
      console.error('Error loading batches:', error);
      toast({ title: 'Error', description: 'Failed to load batches from chain', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Start realtime listeners for new batches and location updates
  const startRealtimeListeners = async () => {
    try {
      await blockchainService.startEventListeners();
      blockchainService.on('BatchCreated', async (event) => {
        try {
          const b = await getBatch(Number(event.data.batchId));
          setBatches(prev => [b, ...prev.filter(x => x.id !== b.id)]);
        } catch {}
      });
      blockchainService.on('BatchLocationUpdated', async (event) => {
        const id = Number(event.data.batchId);
        const newLoc = String(event.data.newLocation);
        setBatches(prev => prev.map(b => b.id === id ? { ...b, location: newLoc } as Batch : b));
      });
    } catch (e) {
      console.error('Error starting listeners:', e);
    }
  };

  // Verify product
  const verifyProductById = async (productId: number) => {
    try {
      setIsLoading(true);
      const result = await verifyProduct(productId);
      
      setVerificationResult({
        valid: true,
        message: 'Product verified successfully',
        product: result.product,
        owners: result.owners
      });
      
      setIsVerifyDialogOpen(true);
    } catch (error) {
      console.error('Error verifying product:', error);
      setVerificationResult({
        valid: false,
        message: 'Failed to verify product. It may not exist on the blockchain.'
      });
      setIsVerifyDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Update batch location
  const updateBatchLocationById = async (batchId: number, newLocation: string) => {
    try {
      setIsLoading(true);
      await updateBatchLocation(batchId, newLocation);
      
      // Update local state
      setBatches(batches.map(batch => 
        batch.id === batchId ? { ...batch, location: newLocation } : batch
      ));
      
      toast({
        title: 'Success',
        description: 'Batch location updated successfully',
      });
    } catch (error) {
      console.error('Error updating batch location:', error);
      toast({
        title: 'Error',
        description: 'Failed to update batch location',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle QR code scan with both Camera & Manual URL support
  const handleQRScan = async (data: string) => {
    try {
      setIsQRScannerOpen(false);
      // Check if URL matches /lot/:id
      const lotMatch = data.match(/\/lot\/([^/?#]+)/);
      const scanId = lotMatch ? lotMatch[1] : data.trim();

      toast({
        title: 'Verifying QR Code...',
        description: `Inspecting payload: ${scanId}`,
      });

      // Look up in Supabase
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scanId);
      const query = isUUID 
        ? supabase.from('crops').select('*').eq('id', scanId).maybeSingle()
        : supabase.from('crops').select('*').ilike('name', `%${scanId}%`).maybeSingle();
      
      const { data: cropData } = await query;

      if (cropData) {
        toast({
          title: 'Produce Verified & Accepted!',
          description: `Identified: ${cropData.name} (${cropData.quantity} ${cropData.unit}). Moving to Logistics.`,
        });
        await supabase.from('crops').update({ status: 'in_transit' }).eq('id', cropData.id);
        await loadDistributorData();
        return;
      }

      // Check batches
      const { data: batchData } = await supabase
        .from('batches')
        .select('*')
        .eq('batch_number', scanId)
        .maybeSingle();

      if (batchData) {
        toast({
          title: 'Batch Verified & Accepted!',
          description: `Batch #${batchData.batch_number} verified and dispatched.`,
        });
        await supabase.from('batches').update({ status: 'in_transit' }).eq('id', batchData.id);
        await loadDistributorData();
        return;
      }

      // Also check blockchain
      const parsed = parseQRCodeData(data);
      if (parsed.type === 'product' && parsed.id) {
        verifyProductById(parsed.id);
      } else if (parsed.type === 'batch' && parsed.id) {
        const batch = batches.find(b => b.id === parsed.id);
        if (batch) {
          setCurrentQRData(data);
          setIsQRDialogOpen(true);
        }
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      toast({
        title: 'Scan Warning',
        description: 'Processed code: ' + data,
      });
    }
  };

  const verifyProduce = (produce: ProduceItem) => {
    setCurrentProduce(produce);
    setIsVerifyDialogOpen(true);
  };

  const handleProcurement = async (itemOrId: any, action: 'accept' | 'reject') => {
    try {
      const item = typeof itemOrId === 'object' ? itemOrId : availableProduce.find(x => x.id === itemOrId);
      const cropId = item?.cropId;
      const newStatus = action === 'accept' ? 'processing' : 'available';

      if (cropId) {
        await supabase.from('crops').update({ status: newStatus }).eq('id', cropId);
      }

      toast({
        title: action === 'accept' ? 'Produce Procured Successfully' : 'Produce Rejected',
        description: `${item?.crop || 'Produce'} (${item?.quantity || ''}) marked as ${newStatus}.`,
      });
      await loadDistributorData();
    } catch (err: any) {
      toast({
        title: 'Procurement Error',
        description: err?.message || 'Failed to update procurement status',
        variant: 'destructive',
      });
    }
  };

  const assignTransport = async (itemOrId: any) => {
    try {
      const item = typeof itemOrId === 'object' ? itemOrId : procuredProduce.find(x => x.id === itemOrId);
      const cropId = item?.cropId;

      if (cropId) {
        await supabase.from('crops').update({ status: 'in_transit' }).eq('id', cropId);
      }

      toast({
        title: 'Transport Dispatched',
        description: `Shipment for ${item?.crop || 'Lot'} is now In Transit to destination FPS.`,
      });
      await loadDistributorData();
    } catch (err: any) {
      toast({
        title: 'Dispatch Error',
        description: err?.message || 'Failed to assign transport',
        variant: 'destructive',
      });
    }
  };

  const scanQRCode = () => {
    setIsQRScannerOpen(true);
    // In a real app, this would activate the camera for QR scanning
  };

  const generateBatchQR = async (batchId: number) => {
    try {
      const qrData = generateBatchQRCode(batchId);
      setCurrentQRData(qrData);
      setIsQRDialogOpen(true);
    } catch (error) {
      console.error('Error generating batch QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-800">Distributor Dashboard</h1>
            <p className="text-gray-600">Welcome back, {profile?.first_name} {profile?.last_name}</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            {!walletConnected && (
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={connectWallet} disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting...</> : 'Connect Wallet'}
              </Button>
            )}
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={scanQRCode}>
            <QrCode className="mr-2 h-4 w-4" /> Scan QR Code
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Produce</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">From 15 verified farmers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Transit</CardTitle>
              <Truck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">To 5 different destinations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Market Demand</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">High</div>
              <p className="text-xs text-muted-foreground">Wheat, Rice, Vegetables</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Procurement</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">â‚¹1.2M</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="available" className="mb-8">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="available">Available Produce</TabsTrigger>
            <TabsTrigger value="procured">Procured Inventory</TabsTrigger>
            <TabsTrigger value="logistics">Logistics Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="available" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Produce</CardTitle>
                <CardDescription>Verify and procure produce from farmers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Crop</th>
                        <th className="text-left py-3 px-2">Farmer</th>
                        <th className="text-left py-3 px-2">Quantity</th>
                        <th className="text-left py-3 px-2">Harvest Date</th>
                        <th className="text-left py-3 px-2">Quality</th>
                        <th className="text-left py-3 px-2">Price</th>
                        <th className="text-left py-3 px-2">Verification</th>
                        <th className="text-left py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableProduce.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">{item.crop}</td>
                          <td className="py-3 px-2">{item.farmer}</td>
                          <td className="py-3 px-2">{item.quantity}</td>
                          <td className="py-3 px-2">{item.harvestDate}</td>
                          <td className="py-3 px-2">{item.quality}</td>
                          <td className="py-3 px-2">{item.price}</td>
                          <td className="py-3 px-2">
                            {item.verified ? (
                              <Badge className="bg-green-500">Verified</Badge>
                            ) : (
                              <Badge variant="outline" className="border-orange-500 text-orange-500">Pending</Badge>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            {!item.verified && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => verifyProduce(item)}
                                className="mr-2"
                              >
                                <ShieldCheck className="h-3 w-3 mr-1" /> Verify
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="mr-2 bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                              onClick={() => handleProcurement(item.id, 'accept')}
                            >
                              Accept
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                              onClick={() => handleProcurement(item.id, 'reject')}
                            >
                              Reject
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="procured" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Procured Inventory</CardTitle>
                <CardDescription>Manage your procured produce and stock</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Crop</th>
                        <th className="text-left py-3 px-2">Farmer</th>
                        <th className="text-left py-3 px-2">Quantity</th>
                        <th className="text-left py-3 px-2">Purchase Date</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Destination</th>
                        <th className="text-left py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {procuredProduce.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">{item.crop}</td>
                          <td className="py-3 px-2">{item.farmer}</td>
                          <td className="py-3 px-2">{item.quantity}</td>
                          <td className="py-3 px-2">{item.purchaseDate}</td>
                          <td className="py-3 px-2">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                item.status === 'In Storage' && 'border-blue-500 text-blue-500',
                                item.status === 'In Transit' && 'border-orange-500 text-orange-500'
                              )}
                            >
                              {item.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">{item.destination}</td>
                          <td className="py-3 px-2">
                            {item.status === 'In Storage' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => assignTransport(item.id)}
                                  className="mr-2"
                                >
                                  <Truck className="h-3 w-3 mr-1" /> Assign Transport
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => generateBatchQR(item.id)}
                                >
                                  <QrCode className="h-3 w-3 mr-1" /> QR Code
                                </Button>
                              </>
                            )}
                            {item.status === 'In Transit' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="mr-2"
                                >
                                  Track Shipment
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => generateBatchQR(item.id)}
                                >
                                  <QrCode className="h-3 w-3 mr-1" /> QR Code
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stock Overview</CardTitle>
                  <CardDescription>Current inventory by crop type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">Wheat</div>
                        <div className="text-sm text-muted-foreground">Premium Quality</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">1,200 kg</div>
                        <div className="text-sm text-muted-foreground">3 warehouses</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">Rice</div>
                        <div className="text-sm text-muted-foreground">Standard Quality</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">800 kg</div>
                        <div className="text-sm text-muted-foreground">2 warehouses</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">Potatoes</div>
                        <div className="text-sm text-muted-foreground">Premium Quality</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">500 kg</div>
                        <div className="text-sm text-muted-foreground">1 warehouse</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Pending Orders</CardTitle>
                  <CardDescription>Orders from retailers awaiting fulfillment</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">Fresh Markets</div>
                        <div className="text-sm text-muted-foreground">Wheat (200kg), Rice (100kg)</div>
                      </div>
                      <Button size="sm">Fulfill</Button>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">City Grocers</div>
                        <div className="text-sm text-muted-foreground">Potatoes (150kg)</div>
                      </div>
                      <Button size="sm">Fulfill</Button>
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">Metro Supermarket</div>
                        <div className="text-sm text-muted-foreground">Rice (300kg), Wheat (100kg)</div>
                      </div>
                      <Button size="sm">Fulfill</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="logistics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logistics Management</CardTitle>
                <CardDescription>Track and manage deliveries and transportation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Active Shipments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-600">8</div>
                        <Button variant="outline" className="w-full mt-4">
                          View All Shipments
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Available Vehicles</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-600">12</div>
                        <Button variant="outline" className="w-full mt-4">
                          Manage Fleet
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Warehouses</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-600">5</div>
                        <Button variant="outline" className="w-full mt-4">
                          View Storage Capacity
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Deliveries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">Wheat Delivery</div>
                            <div className="text-sm text-muted-foreground">To: Fresh Markets</div>
                          </div>
                          <Badge className="bg-green-500">Delivered</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">Rice Shipment</div>
                            <div className="text-sm text-muted-foreground">To: City Grocers</div>
                          </div>
                          <Badge className="bg-orange-500">In Transit</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">Potato Delivery</div>
                            <div className="text-sm text-muted-foreground">To: Metro Supermarket</div>
                          </div>
                          <Badge className="bg-green-500">Delivered</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Transport Assignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="produce">Select Produce</Label>
                            <Select>
                              <SelectTrigger id="produce">
                                <SelectValue placeholder="Select produce" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="wheat-1">Wheat (800 kg) - Warehouse A</SelectItem>
                                <SelectItem value="rice-1">Rice (500 kg) - Warehouse B</SelectItem>
                                <SelectItem value="potatoes-1">Potatoes (300 kg) - Warehouse C</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="vehicle">Select Vehicle</Label>
                            <Select>
                              <SelectTrigger id="vehicle">
                                <SelectValue placeholder="Select vehicle" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="truck-1">Truck 1 - Available</SelectItem>
                                <SelectItem value="truck-2">Truck 2 - Available</SelectItem>
                                <SelectItem value="truck-3">Truck 3 - Available</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="destination">Destination</Label>
                            <Select>
                              <SelectTrigger id="destination">
                                <SelectValue placeholder="Select destination" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fresh-markets">Fresh Markets</SelectItem>
                                <SelectItem value="city-grocers">City Grocers</SelectItem>
                                <SelectItem value="metro-supermarket">Metro Supermarket</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="driver">Driver</Label>
                            <Select>
                              <SelectTrigger id="driver">
                                <SelectValue placeholder="Select driver" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="driver-1">Rajesh Kumar</SelectItem>
                                <SelectItem value="driver-2">Sunil Sharma</SelectItem>
                                <SelectItem value="driver-3">Anil Patel</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                          Assign Transport
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Produce Authenticity</DialogTitle>
            <DialogDescription>
              Verify the blockchain record for this produce to ensure authenticity.
            </DialogDescription>
          </DialogHeader>
          {currentProduce && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Crop Type</p>
                  <p>{currentProduce.crop}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Farmer</p>
                  <p>{currentProduce.farmer}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Harvest Date</p>
                  <p>{currentProduce.harvestDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Quality</p>
                  <p>{currentProduce.quality}</p>
                </div>
              </div>
              
              <div className="border rounded-md p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">Blockchain Verification</p>
                <p className="text-xs font-mono break-all">0x7f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsVerifyDialogOpen(false)} variant="outline">Cancel</Button>
            <Button onClick={() => {
              setIsVerifyDialogOpen(false);
              alert('Produce verified successfully!');
            }} className="bg-green-600 hover:bg-green-700">Confirm Verification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Live Camera QR Scanner */}
      <LiveQRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanSuccess={handleQRScan}
        title="Scan Batch / Produce QR"
        description="Aim camera at batch shipping tags or warehouse intake QR codes."
      />
      
      <QRCodeGenerator
        data={currentQRData}
        title="Batch QR Code"
        description="This QR code contains blockchain-verified information about the batch. Retailers and consumers can scan this to verify authenticity."
        showDialog={isQRDialogOpen}
        onClose={() => setIsQRDialogOpen(false)}
      />
    </div>
  );
};

export default DistributorDashboard;
