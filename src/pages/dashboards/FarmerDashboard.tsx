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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, Tractor, TrendingUp, QrCode, Leaf, BarChart3, DollarSign, Clock, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { 
  createProduct, 
  createBatch, 
  getProduct, 
  getBatch, 
  getProductStatus, 
  connectWallet, 
  getCurrentAccount,
  generateProductQRCode,
  generateBatchQRCode,
  generateQRCodeDataURL,
  createProductWithINR,
  convertETHToINR,
  blockchainService,
  Product,
  Batch
} from '@/lib/blockchain';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { supabase } from '@/integrations/supabase/client';
import { useBlockchain } from '@/hooks/useBlockchain';
import AIPricePredictionSimple from '@/components/AIPricePredictionSimple';
import { PredictionResponse } from '@/services/simpleAIService';

const FarmerDashboard = () => {
  const { user, profile, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [walletConnected, setWalletConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [offchainBatches, setOffchainBatches] = useState<Array<{ id: string; qr: string; createdAt: string; location: string; productCount: number }>>([]);
  const [offchainProduce, setOffchainProduce] = useState<Array<{ id: string; crop: string; quantity: string; date: string; price: string; status: string; qr: string }>>([]);
  const [procedures, setProcedures] = useState<Array<any>>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    imageHash: '',
    price: '',
    quantityKg: '',
    mspPerKg: '',
    farmerWallet: '',
    region: '',
  });
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [newBatch, setNewBatch] = useState({
    productIds: [] as number[],
    location: '',
  });
  const [batchDetails, setBatchDetails] = useState({
    farmerId: '',
    farmerName: profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : '',
    phone: '',
    locationVillage: '',
    locationDistrict: '',
    locationState: '',
    landSurveyNumber: '',
    cropType: '',
    cropVariety: '',
    cropGrade: '',
    cultivationDate: '',
    harvestDate: '',
    quantityProduced: '',
    certificationInfo: '',
  });
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [harvestDate, setHarvestDate] = useState<Date | undefined>(new Date());
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [currentQRCode, setCurrentQRCode] = useState('');
  const [currentQRData, setCurrentQRData] = useState('');
  const [qrType, setQrType] = useState<'product' | 'batch'>('product');
  const { registerCrop, getPricePrediction } = useBlockchain();
  const [isStorageChoiceOpen, setIsStorageChoiceOpen] = useState(false);
  const [aiPrediction, setAiPrediction] = useState<PredictionResponse | null>(null);
  
  // Ensure this dashboard is only accessible to farmers
  useEffect(() => {
    if (!loading && userRole !== UserRole.FARMER && userRole !== UserRole.ADMIN) {
      navigate('/', { replace: true });
    }
  }, [userRole, loading, navigate]);

  // Connect wallet and load data (non-blocking)
  useEffect(() => {
    const init = async () => {
      try {
        const account = await getCurrentAccount();
        if (account) {
          setWalletConnected(true);
          await loadFarmData(account);
        }
      } catch (error) {
        console.error('Error initializing wallet:', error);
        // Do not show destructive toast on init; keep dashboard usable without wallet
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const loadFarmData = async (account: string) => {
    try {
      setIsLoading(true);
      
      // Start blockchain event listeners to get real-time updates
      await blockchainService.startEventListeners();
      
      // Listen for new products and batches
      blockchainService.on('ProductCreated', async (event) => {
        if (event.data.farmer.toLowerCase() === account.toLowerCase()) {
          try {
            const product = await getProduct(event.data.productId);
            setProducts(prev => [product, ...prev]);
            toast({
              title: 'New Product Created',
              description: `Product "${product.name}" has been added to blockchain`,
            });
          } catch (error) {
            console.error('Error fetching new product:', error);
          }
        }
      });

      blockchainService.on('BatchCreated', async (event) => {
        if (event.data.creator.toLowerCase() === account.toLowerCase()) {
          try {
            const batch = await getBatch(event.data.batchId);
            setBatches(prev => [batch, ...prev]);
            
            // Automatically generate QR code for new batch
            const qrData = generateBatchQRCode(batch.id);
            setCurrentQRData(qrData);
            setQrType('batch');
            const qrCodeUrl = await generateQRCodeDataURL(qrData);
            setCurrentQRCode(qrCodeUrl);
            setIsQRDialogOpen(true);
            
            toast({
              title: 'New Batch Created',
              description: `Batch #${batch.id} has been created with ${batch.productIds.length} products`,
            });
          } catch (error) {
            console.error('Error fetching new batch:', error);
          }
        }
      });

      // Load existing products and batches
      await loadExistingProducts(account);
      await loadExistingBatches(account);
      await loadProcedures();
      
    } catch (error) {
      console.error('Error loading farm data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load farm data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load My Procedures from DB for persistent display
  const loadProcedures = async () => {
    try {
      if (!profile?.id) return;
      const { data, error } = await supabase
        .from('my_procedures')
        .select('*')
        .eq('farmer_id', profile.id)
        .order('created_at', { ascending: false });
      if (!error && data) setProcedures(data);
    } catch (e) {
      // Non-fatal
    }
  };

  const loadExistingProducts = async (account: string) => {
    try {
      // Get product count from contract
      const contract = await blockchainService.getContract();
      const productCount = await contract.productCount();
      
      const farmerProducts: Product[] = [];
      
      // Check each product to see if it belongs to this farmer
      for (let i = 1; i <= productCount; i++) {
        try {
          const product = await getProduct(i);
          if (product.farmer.toLowerCase() === account.toLowerCase()) {
            farmerProducts.push(product);
          }
        } catch (error) {
          // Product might not exist, continue
          continue;
        }
      }
      
      setProducts(farmerProducts);
    } catch (error) {
      console.error('Error loading existing products:', error);
    }
  };

  const loadExistingBatches = async (account: string) => {
    try {
      // Load off-chain batches for this farmer for persistence
      if (profile?.id) {
        const { data } = await supabase
          .from('my_batches_with_qr')
          .select('*')
          .eq('farmer_id', profile.id)
          .order('created_at', { ascending: false });
        // Map minimal shape for display in the existing section if needed
        // We keep on-chain batches in `batches`, and off-chain are in `offchainBatches` state
        const oc = (data || []).map((b: any) => ({
          id: String(b.id),
          qr: b.qr_code,
          createdAt: b.created_at,
          location: b.location,
          productCount: b.product_count || 1,
        }));
        setOffchainBatches(oc);
      }
    } catch (error) {
      console.error('Error loading existing batches:', error);
    }
  };

  const handleConnectWallet = async () => {
    try {
      setIsLoading(true);
      const address = await connectWallet();
      setWalletConnected(true);
      setWalletAddress(address);
      
      toast({
        title: 'MetaMask Connected',
        description: `Wallet connected successfully! Address: ${address.slice(0, 6)}...${address.slice(-4)}`,
      });
      
      // Load farm data after successful connection
      await loadFarmData(address);
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setWalletConnected(false);
      setWalletAddress('');
      
      toast({
        title: 'Could not connect MetaMask',
        description: error.message || 'Check that MetaMask is installed, unlocked, and you approved the request.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    // Open storage choice modal
    setIsStorageChoiceOpen(true);
  };

  const createProductOnSupabase = async () => {
    if (!newProduct.name || !newProduct.description || !newProduct.price) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreatingProduct(true);
      // Suggest fair price via AI (optional)
      let predictedPrice: number | undefined = undefined;
      try {
        const ai = await getPricePrediction(
          newProduct.name,
          parseFloat(newProduct.price || '0') || 0,
          parseFloat(newProduct.quantityKg || batchDetails.quantityProduced || '0') || 0,
          newProduct.region || [batchDetails.locationDistrict, batchDetails.locationState].filter(Boolean).join(', ')
        );
        predictedPrice = ai?.suggestedPrice ?? ai?.predictedPrice ?? undefined;
      } catch (_) {}
      const cropPayload = {
        name: newProduct.name,
        quantity: parseFloat(newProduct.quantityKg || batchDetails.quantityProduced || '0') || 0,
        unit: 'kg',
        pricePerUnit: parseFloat(newProduct.price || '0') || 0,
        predictedPrice,
        description: newProduct.description,
        harvestDate: batchDetails.harvestDate || undefined,
        location: newProduct.region || [batchDetails.locationVillage, batchDetails.locationDistrict, batchDetails.locationState].filter(Boolean).join(', '),
        certifications: batchDetails.certificationInfo ? batchDetails.certificationInfo.split(',').map(s => s.trim()) : [],
        mspPerKg: parseFloat(newProduct.mspPerKg || '0') || undefined,
        farmerWallet: newProduct.farmerWallet || walletAddress || undefined,
        imageHash: newProduct.imageHash || undefined,
      };
      const resp: any = await registerCrop(cropPayload);
      const qr = resp?.qrCode || resp?.batch?.qr_code;
      if (qr) {
        setQrType('batch');
        setCurrentQRData(qr);
        try {
          const img = await generateQRCodeDataURL(qr);
          setCurrentQRCode(img);
        } catch (_) {}
        setIsQRDialogOpen(true);

        // Update My Batches (off-chain entry)
        const batchId = resp?.batch?.id || `${Date.now()}`;
        setOffchainBatches(prev => [
          {
            id: String(batchId),
            qr,
            createdAt: resp?.batch?.created_at || new Date().toISOString(),
            location: cropPayload.location,
            productCount: 1
          },
          ...prev
        ]);

        // Update My Produce Listings (off-chain entry)
        setOffchainProduce(prev => [
          {
            id: String(batchId),
            crop: cropPayload.name,
            quantity: `${cropPayload.quantity} ${cropPayload.unit}`,
            date: new Date().toLocaleDateString(),
            price: `₹${cropPayload.pricePerUnit}`,
            status: 'Listed',
            qr
          },
          ...prev
        ]);

        // Upsert into procedures so it appears under My Procedures
        try {
          await supabase.from('procedures').upsert({
            farmer_id: profile?.id,
            crop_id: resp?.crop?.id || null,
            batch_id: resp?.batch?.id || null,
            name: cropPayload.name,
            description: cropPayload.description || '',
            quantity: cropPayload.quantity,
            unit: cropPayload.unit,
            price_per_unit: cropPayload.pricePerUnit,
            msp_per_kg: cropPayload.mspPerKg || null,
            predicted_price: cropPayload.predictedPrice || null,
            region: cropPayload.location || null,
            image_hash: cropPayload.imageHash || null,
            farmer_wallet: cropPayload.farmerWallet || null,
            qr_code: qr,
            status: 'listed'
          }, { onConflict: 'qr_code' });
          await loadProcedures();
        } catch (_) {}
      }
      toast({
        title: 'Crop submitted',
        description: 'Saved via Supabase and anchored to blockchain records (no gas).',
      });
      setNewProduct({ name: '', description: '', imageHash: '', price: '', quantityKg: '', mspPerKg: '', farmerWallet: '', region: '' });
      setIsProductDialogOpen(false);
    } catch (e) {
      // handled in hook
    } finally {
      setIsCreatingProduct(false);
      setIsStorageChoiceOpen(false);
    }
  };

  const ensureWalletConnected = async (): Promise<string> => {
    if (walletConnected && walletAddress) return walletAddress;
    const address = await connectWallet();
    setWalletConnected(true);
    setWalletAddress(address);
    return address;
  };

  const createProductOnBlockchain = async () => {
    if (!newProduct.name || !newProduct.description || !newProduct.price) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const inrPrice = parseFloat(newProduct.price);
    if (isNaN(inrPrice) || inrPrice <= 0) {
      toast({
        title: 'Invalid Price',
        description: 'Please enter a valid INR price',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreatingProduct(true);
      await ensureWalletConnected();
      const productId = await createProductWithINR(
        newProduct.name,
        newProduct.description,
        newProduct.imageHash || 'QmDefaultImageHash',
        inrPrice
      );
      toast({
        title: 'Success',
        description: `Product "${newProduct.name}" created on blockchain with ID: ${productId}`,
      });
      setNewProduct({ name: '', description: '', imageHash: '', price: '' });
      setIsProductDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating product on blockchain:', error);
      toast({
        title: 'On-chain creation failed',
        description: error?.message || 'Please check MetaMask and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingProduct(false);
      setIsStorageChoiceOpen(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!walletConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return;
    }

    if (newBatch.productIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one product',
        variant: 'destructive',
      });
      return;
    }

    if (!newBatch.location) {
      toast({
        title: 'Missing Location',
        description: 'Please specify the batch location',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreatingBatch(true);
      
      // Create batch on blockchain
      const batchId = await createBatch(
        newBatch.productIds,
        newBatch.location
      );
      
      toast({
        title: 'Success',
        description: `Batch #${batchId} created successfully with ${newBatch.productIds.length} products`,
      });
      
      // Persist batch metadata to Supabase for off-chain details and QR mapping
      try {
        const qrUrl = generateBatchQRCode(batchId);
        await supabase.from('batches').insert({
          batch_id: batchId,
          farmer_wallet: walletAddress,
          farmer_id: batchDetails.farmerId,
          farmer_name: batchDetails.farmerName,
          phone: batchDetails.phone,
          village: batchDetails.locationVillage,
          district: batchDetails.locationDistrict,
          state: batchDetails.locationState,
          land_survey: batchDetails.landSurveyNumber,
          crop_type: batchDetails.cropType,
          crop_variety: batchDetails.cropVariety,
          crop_grade: batchDetails.cropGrade,
          cultivation_date: batchDetails.cultivationDate || null,
          harvest_date: batchDetails.harvestDate || null,
          quantity_produced: batchDetails.quantityProduced,
          certification_info: batchDetails.certificationInfo,
          product_ids: newBatch.productIds,
          location: newBatch.location,
          qr_url: qrUrl
        });
      } catch (err) {
        console.error('Error saving batch details:', err);
      }

      // Reset form and close dialog
      setNewBatch({
        productIds: [],
        location: '',
      });
      setBatchDetails({
        farmerId: '',
        farmerName: profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : '',
        phone: '',
        locationVillage: '',
        locationDistrict: '',
        locationState: '',
        landSurveyNumber: '',
        cropType: '',
        cropVariety: '',
        cropGrade: '',
        cultivationDate: '',
        harvestDate: '',
        quantityProduced: '',
        certificationInfo: '',
      });
      setSelectedProducts([]);
      setIsBatchDialogOpen(false);
      
      // The batch will be automatically added via event listener with QR code generation
      
    } catch (error) {
      console.error('Error creating batch:', error);
      toast({
        title: 'Error',
        description: 'Failed to create batch. Please check your wallet and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingBatch(false);
    }
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Calculate real statistics from blockchain data
  const calculateEarnings = () => {
    const totalValue = products.reduce((sum, product) => {
      return sum + convertETHToINR(product.price);
    }, 0);
    
    const soldProducts = products.filter(product => product.status >= 4); // Sold or higher
    const pendingProducts = products.filter(product => product.status < 4);
    
    const soldValue = soldProducts.reduce((sum, product) => {
      return sum + convertETHToINR(product.price);
    }, 0);
    
    const pendingValue = pendingProducts.reduce((sum, product) => {
      return sum + convertETHToINR(product.price);
    }, 0);
    
    return {
      total: `₹${totalValue.toLocaleString()}`,
      pending: `₹${pendingValue.toLocaleString()}`,
      sold: `₹${soldValue.toLocaleString()}`,
      activeListings: products.length
    };
  };

  const earnings = calculateEarnings();

  const cropAdvisory = [
    { crop: 'Wheat', recommendation: 'Ideal planting time in 2 weeks', confidence: 'High' },
    { crop: 'Pulses', recommendation: 'Market demand increasing', confidence: 'Medium' },
    { crop: 'Vegetables', recommendation: 'Consider greenhouse cultivation', confidence: 'High' },
  ];

  // Convert blockchain products to display format
  const recentProduceListings = products.map(product => ({
    id: product.id,
    crop: product.name,
    quantity: '1 unit', // Could be enhanced with actual quantity data
    date: new Date(product.createdAt * 1000).toLocaleDateString(),
    status: getProductStatus(product.status),
    price: `₹${convertETHToINR(product.price).toLocaleString()}`,
    verified: true,
    blockchainId: product.id
  }));

  const generateQRCode = async (produceId: number, type: 'product' | 'batch' = 'product') => {
    try {
      const qrData = type === 'product' 
        ? generateProductQRCode(produceId)
        : generateBatchQRCode(produceId);
      
      setCurrentQRData(qrData);
      setQrType(type);
      const qrCodeUrl = await generateQRCodeDataURL(qrData);
      setCurrentQRCode(qrCodeUrl);
      setIsQRDialogOpen(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        variant: 'destructive',
      });
    }
  };

  const handleProduceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // This would submit the produce data to Supabase and generate blockchain record
    // For demo purposes, we're just showing an alert
    alert('Produce listed successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-green-800">Farmer Dashboard</h1>
            <p className="text-gray-600">Welcome back, {profile?.first_name} {profile?.last_name}</p>
            {walletConnected && walletAddress && (
              <p className="text-sm text-green-600 mt-1">
                MetaMask Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-4 mt-4 md:mt-0">
            {!walletConnected ? (
              <Button 
                onClick={handleConnectWallet}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Connect MetaMask
                  </>
                )}
              </Button>
            ) : (
              <Button className="bg-green-600 hover:bg-green-700">
                <Leaf className="mr-2 h-4 w-4" /> View Crop Calendar
              </Button>
            )}
          </div>
        </div>

        {!walletConnected && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-800">Connect MetaMask to Get Started</CardTitle>
              <CardDescription className="text-blue-700">
                Connect your wallet to create products and batches on the blockchain.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="text-sm text-blue-800/90">
                Ensure MetaMask is installed in your browser. You must have the Farmer role to proceed.
              </div>
              <Button 
                onClick={handleConnectWallet}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Connect MetaMask
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{earnings.total}</div>
              <p className="text-xs text-muted-foreground">Total value of all products</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
              <Tractor className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{earnings.activeListings}</div>
              <p className="text-xs text-muted-foreground">{earnings.pending} pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Market Demand</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{batches.length}</div>
              <p className="text-xs text-muted-foreground">Active batches</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Forecast</CardTitle>
              <BarChart3 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{earnings.sold}</div>
              <p className="text-xs text-muted-foreground">Products sold</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="listings" className="mb-8">
          <TabsList className="grid w-full grid-cols-7 mb-4">
            <TabsTrigger value="listings">My Produce</TabsTrigger>
            <TabsTrigger value="batches">My Batches</TabsTrigger>
            <TabsTrigger value="procedures">My Procedures</TabsTrigger>
            <TabsTrigger value="add">Add New Produce</TabsTrigger>
            <TabsTrigger value="ai-prediction">AI Prediction</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="advisory">Crop Advisory</TabsTrigger>
          </TabsList>
          
          <TabsContent value="listings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Produce Listings</CardTitle>
                <CardDescription>Manage your produce listings and track their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Crop</th>
                        <th className="text-left py-3 px-2">Quantity</th>
                        <th className="text-left py-3 px-2">Listed Date</th>
                        <th className="text-left py-3 px-2">Price</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Off-chain produce listings */}
                      {offchainProduce.map((item) => (
                        <tr key={`off-${item.id}`} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">{item.crop}</td>
                          <td className="py-3 px-2">{item.quantity}</td>
                          <td className="py-3 px-2">{item.date}</td>
                          <td className="py-3 px-2">{item.price}</td>
                          <td className="py-3 px-2">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                item.status === 'Listed' && 'border-blue-500 text-blue-500',
                                item.status === 'Sold' && 'border-green-500 text-green-500',
                                item.status === 'In Transit' && 'border-orange-500 text-orange-500'
                              )}
                            >
                              {item.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={async () => {
                                setQrType('batch');
                                setCurrentQRData(item.qr);
                                try { setCurrentQRCode(await generateQRCodeDataURL(item.qr)); } catch(_) {}
                                setIsQRDialogOpen(true);
                              }}
                              className="mr-2"
                            >
                              <QrCode className="h-3 w-3 mr-1" /> QR Code
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {/* On-chain produce listings */}
                      {recentProduceListings.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">{item.crop}</td>
                          <td className="py-3 px-2">{item.quantity}</td>
                          <td className="py-3 px-2">{item.date}</td>
                          <td className="py-3 px-2">{item.price}</td>
                          <td className="py-3 px-2">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                item.status === 'Listed' && 'border-blue-500 text-blue-500',
                                item.status === 'Sold' && 'border-green-500 text-green-500',
                                item.status === 'In Transit' && 'border-orange-500 text-orange-500'
                              )}
                            >
                              {item.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => generateQRCode(item.id)}
                              className="mr-2"
                            >
                              <QrCode className="h-3 w-3 mr-1" /> QR Code
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
          
          <TabsContent value="batches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Batches</CardTitle>
                <CardDescription>Manage your product batches and generate QR codes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {batches.length} batches created
                  </p>
                  <Button 
                    onClick={() => setIsBatchDialogOpen(true)}
                    disabled={products.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Batch
                  </Button>
                </div>
                
                {batches.length === 0 && offchainBatches.length === 0 ? (
                  <div className="text-center py-8">
                    <Tractor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No batches yet</h3>
                    <p className="text-gray-500 mb-4">Create your first batch to start selling products</p>
                    <Button 
                      onClick={() => setIsBatchDialogOpen(true)}
                      disabled={products.length === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Batch
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Off-chain batches */}
                    {offchainBatches.map((batch) => (
                      <div key={`off-${batch.id}`} className="border rounded-lg p-4 hover:bg-muted/50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">Batch #{batch.id}</h3>
                            <p className="text-sm text-muted-foreground">
                              {batch.productCount} products • Created {new Date(batch.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Location: {batch.location}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                setQrType('batch');
                                setCurrentQRData(batch.qr);
                                try { setCurrentQRCode(await generateQRCodeDataURL(batch.qr)); } catch(_) {}
                                setIsQRDialogOpen(true);
                              }}
                            >
                              <QrCode className="h-3 w-3 mr-1" /> QR Code
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* On-chain batches */}
                    {batches.map((batch) => (
                      <div key={batch.id} className="border rounded-lg p-4 hover:bg-muted/50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">Batch #{batch.id}</h3>
                            <p className="text-sm text-muted-foreground">
                              {batch.productIds.length} products • Created {new Date(batch.createdAt * 1000).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Location: {batch.location}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => generateQRCode(batch.id, 'batch')}
                            >
                              <QrCode className="h-3 w-3 mr-1" /> QR Code
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">
                            Products: {batch.productIds.join(', ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="procedures" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Procedures</CardTitle>
                <CardDescription>All procedures created via gasless or on-chain paths</CardDescription>
              </CardHeader>
              <CardContent>
                {procedures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No procedures yet.</p>
                ) : (
                  <div className="space-y-3">
                    {procedures.map((p) => (
                      <div key={p.id} className="border rounded-lg p-4 flex items-start justify-between">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {p.quantity} {p.unit} • ₹{Number(p.price_per_unit).toLocaleString()} / kg • MSP {p.msp_per_kg ? `₹${Number(p.msp_per_kg).toLocaleString()}` : '—'}
                          </div>
                          <div className="text-xs text-muted-foreground break-all">QR: {p.qr_code}</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            setQrType('batch');
                            setCurrentQRData(p.qr_code);
                            try { setCurrentQRCode(await generateQRCodeDataURL(p.qr_code)); } catch(_) {}
                            setIsQRDialogOpen(true);
                          }}
                        >
                          <QrCode className="h-3 w-3 mr-1" /> QR Code
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-prediction" className="space-y-4">
            <AIPricePredictionSimple 
              onPredictionComplete={(prediction) => {
                setAiPrediction(prediction);
                toast({
                  title: 'AI Prediction Complete',
                  description: `Predicted price: ₹${prediction.predicted_price.toLocaleString()}`,
                });
              }}
            />
            
            {aiPrediction && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Latest Prediction Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        ₹{aiPrediction.predicted_price.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Predicted Price</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-lg font-semibold text-blue-600">
                        {aiPrediction.model_metadata.model_type}
                      </div>
                      <div className="text-sm text-gray-600">AI Model</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-lg font-semibold text-purple-600">
                        {aiPrediction.confidence_interval[1] - aiPrediction.confidence_interval[0] < aiPrediction.predicted_price * 0.1 ? 'High' : 'Medium'}
                      </div>
                      <div className="text-sm text-gray-600">Confidence</div>
                    </div>
                  </div>
                  
                  {aiPrediction.recommendations && aiPrediction.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Key Recommendations:</h4>
                      <ul className="space-y-1">
                        {aiPrediction.recommendations.slice(0, 3).map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>Add New Produce</CardTitle>
                <CardDescription>List your new harvest for distributors</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleCreateProduct(); }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-name">Product Name *</Label>
                      <Input 
                        id="product-name"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Organic Wheat"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="product-description">Description *</Label>
                      <Textarea 
                        id="product-description"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your product..."
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="product-price">Price (INR) *</Label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                          ₹
                        </span>
                        <Input 
                          id="product-price"
                          type="number"
                          step="1"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="1000"
                          className="rounded-l-none"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          Price will be converted to ETH automatically for blockchain storage
                        </p>
                        {aiPrediction && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNewProduct(prev => ({ 
                                ...prev, 
                                price: aiPrediction.predicted_price.toString() 
                              }));
                              toast({
                                title: 'AI Price Applied',
                                description: `Applied AI predicted price: ₹${aiPrediction.predicted_price.toLocaleString()}`,
                              });
                            }}
                            className="text-xs"
                          >
                            <Brain className="h-3 w-3 mr-1" />
                            Use AI Price
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="quantity-kg">Quantity (kg) *</Label>
                      <Input 
                        id="quantity-kg"
                        type="number"
                        step="0.01"
                        value={newProduct.quantityKg}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, quantityKg: e.target.value }))}
                        placeholder="100"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="msp">MSP (per kg) *</Label>
                      <Input 
                        id="msp"
                        type="number"
                        step="0.01"
                        value={newProduct.mspPerKg}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, mspPerKg: e.target.value }))}
                        placeholder="24"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="farmer-wallet">Farmer Wallet Address</Label>
                      <Input 
                        id="farmer-wallet"
                        value={newProduct.farmerWallet}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, farmerWallet: e.target.value }))}
                        placeholder="0x..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="region">Location / Region</Label>
                      <Input 
                        id="region"
                        value={newProduct.region}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, region: e.target.value }))}
                        placeholder="Village, District, State"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="image-hash">Image Hash (IPFS)</Label>
                      <Input 
                        id="image-hash"
                        value={newProduct.imageHash}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, imageHash: e.target.value }))}
                        placeholder="QmHash... (optional)"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="bg-green-600 hover:bg-green-700 w-full md:w-auto"
                      disabled={isCreatingProduct || !walletConnected}
                    >
                      {isCreatingProduct ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Product...
                        </>
                      ) : (
                        'Create Product on Blockchain'
                      )}
                    </Button>
                    {!walletConnected && (
                      <p className="text-sm text-red-600 mt-2">Please connect your wallet first</p>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Overview</CardTitle>
                <CardDescription>Track your earnings and pending payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Total Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">{earnings.total}</div>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">This Month</span>
                          <span className="font-medium">{earnings.thisMonth}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Month</span>
                          <span className="font-medium">{earnings.lastMonth}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pending</span>
                          <span className="font-medium text-orange-500">{earnings.pending}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Transaction History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">Wheat Sale</div>
                            <div className="text-sm text-muted-foreground">To: Agri Distributors</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-green-600">+₹15,000</div>
                            <div className="text-sm text-muted-foreground">Oct 15, 2023</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">Rice Sale</div>
                            <div className="text-sm text-muted-foreground">To: FoodChain Inc.</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-green-600">+₹10,500</div>
                            <div className="text-sm text-muted-foreground">Oct 10, 2023</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">Tomatoes Sale</div>
                            <div className="text-sm text-muted-foreground">To: Fresh Markets</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-orange-500">Pending ₹1,500</div>
                            <div className="text-sm text-muted-foreground">Oct 5, 2023</div>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full mt-4">
                        View All Transactions
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="advisory">
            <Card>
              <CardHeader>
                <CardTitle>Crop Advisory</CardTitle>
                <CardDescription>AI-powered recommendations for your farm</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {cropAdvisory.map((item, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">{item.crop}</CardTitle>
                            <Badge variant="outline" className={cn(
                              item.confidence === 'High' && 'border-green-500 text-green-500',
                              item.confidence === 'Medium' && 'border-orange-500 text-orange-500',
                              item.confidence === 'Low' && 'border-red-500 text-red-500'
                            )}>
                              {item.confidence} Confidence
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p>{item.recommendation}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Market Price Forecast</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="font-medium">Wheat</div>
                          <div className="flex items-center">
                            <span className="font-medium mr-2">₹22/kg</span>
                            <Badge className="bg-green-500">+10%</Badge>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="font-medium">Rice</div>
                          <div className="flex items-center">
                            <span className="font-medium mr-2">₹38/kg</span>
                            <Badge className="bg-green-500">+8%</Badge>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="font-medium">Tomatoes</div>
                          <div className="flex items-center">
                            <span className="font-medium mr-2">₹12/kg</span>
                            <Badge className="bg-red-500">-5%</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Weather Impact</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start space-x-4">
                        <AlertCircle className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                        <div>
                          <p className="font-medium">Moderate rainfall expected in the next 10 days</p>
                          <p className="text-muted-foreground mt-1">Consider harvesting mature crops and ensuring proper drainage for fields.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <QRCodeGenerator
        data={currentQRData}
        title={`${qrType === 'product' ? 'Product' : 'Batch'} QR Code`}
        description={`This QR code contains blockchain-verified information about your ${qrType}. Distributors and consumers can scan this to verify authenticity.`}
        showDialog={isQRDialogOpen}
        onClose={() => setIsQRDialogOpen(false)}
      />

      {/* Storage Choice Dialog */}
      <Dialog open={isStorageChoiceOpen} onOpenChange={setIsStorageChoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Where do you want to store this product?</DialogTitle>
            <DialogDescription>
              Choose Blockchain (MetaMask) for on-chain record, or Supabase (No MetaMask) for free gasless record with blockchain anchoring.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border">
              <CardHeader>
                <CardTitle>Blockchain (MetaMask)</CardTitle>
                <CardDescription>Requires MetaMask, on-chain record, transaction fees apply on real network.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={createProductOnBlockchain} disabled={isCreatingProduct} className="w-full">
                  {isCreatingProduct ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : 'Store on Blockchain'}
                </Button>
              </CardContent>
            </Card>
            <Card className="border">
              <CardHeader>
                <CardTitle>Supabase (No MetaMask)</CardTitle>
                <CardDescription>Free and instant. Data stored off-chain with blockchain-style proof (hash).</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={createProductOnSupabase} disabled={isCreatingProduct} className="w-full">
                  {isCreatingProduct ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Store in Supabase'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Creation Dialog */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
            <DialogDescription>
              Select products to create a batch for distribution
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="batch-location">Batch Location *</Label>
              <Input 
                id="batch-location"
                value={newBatch.location}
                onChange={(e) => setNewBatch(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Farm Warehouse A"
                required
              />
            </div>

            {/* Extended farmer and crop details for the batch */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="farmer-id">Farmer ID (Aadhaar / Govt ID) *</Label>
                <Input id="farmer-id" value={batchDetails.farmerId} onChange={(e) => setBatchDetails(prev => ({ ...prev, farmerId: e.target.value }))} placeholder="e.g., 1234-5678-9012" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmer-name">Farmer Name *</Label>
                <Input id="farmer-name" value={batchDetails.farmerName} onChange={(e) => setBatchDetails(prev => ({ ...prev, farmerName: e.target.value }))} placeholder="e.g., Ramesh Kumar" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Contact (Phone) *</Label>
                <Input id="phone" value={batchDetails.phone} onChange={(e) => setBatchDetails(prev => ({ ...prev, phone: e.target.value }))} placeholder="e.g., +91 9876543210" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="survey">Land Details (Survey / Farm ID)</Label>
                <Input id="survey" value={batchDetails.landSurveyNumber} onChange={(e) => setBatchDetails(prev => ({ ...prev, landSurveyNumber: e.target.value }))} placeholder="e.g., SVY-45-22A" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="village">Village</Label>
                <Input id="village" value={batchDetails.locationVillage} onChange={(e) => setBatchDetails(prev => ({ ...prev, locationVillage: e.target.value }))} placeholder="e.g., Rampur" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <Input id="district" value={batchDetails.locationDistrict} onChange={(e) => setBatchDetails(prev => ({ ...prev, locationDistrict: e.target.value }))} placeholder="e.g., Bhopal" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={batchDetails.locationState} onChange={(e) => setBatchDetails(prev => ({ ...prev, locationState: e.target.value }))} placeholder="e.g., Madhya Pradesh" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="crop-type">Crop Type *</Label>
                <Input id="crop-type" value={batchDetails.cropType} onChange={(e) => setBatchDetails(prev => ({ ...prev, cropType: e.target.value }))} placeholder="e.g., Wheat, Rice, Vegetables" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crop-variety">Variety</Label>
                <Input id="crop-variety" value={batchDetails.cropVariety} onChange={(e) => setBatchDetails(prev => ({ ...prev, cropVariety: e.target.value }))} placeholder="e.g., Sharbati" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crop-grade">Grade</Label>
                <Input id="crop-grade" value={batchDetails.cropGrade} onChange={(e) => setBatchDetails(prev => ({ ...prev, cropGrade: e.target.value }))} placeholder="e.g., A / Premium" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cultivation">Cultivation Date</Label>
                <Input type="date" id="cultivation" value={batchDetails.cultivationDate} onChange={(e) => setBatchDetails(prev => ({ ...prev, cultivationDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="harvest">Harvest Date</Label>
                <Input type="date" id="harvest" value={batchDetails.harvestDate} onChange={(e) => setBatchDetails(prev => ({ ...prev, harvestDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity Produced</Label>
                <Input id="quantity" value={batchDetails.quantityProduced} onChange={(e) => setBatchDetails(prev => ({ ...prev, quantityProduced: e.target.value }))} placeholder="e.g., 500 kg" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="certification">Certification Info</Label>
              <Input id="certification" value={batchDetails.certificationInfo} onChange={(e) => setBatchDetails(prev => ({ ...prev, certificationInfo: e.target.value }))} placeholder="e.g., Organic, FSSAI" />
            </div>
            
            <div className="space-y-2">
              <Label>Select Products</Label>
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products available. Create a product first.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`product-${product.id}`}
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="rounded"
                      />
                      <label htmlFor={`product-${product.id}`} className="text-sm">
                        {product.name} - ₹{convertETHToINR(product.price).toLocaleString()}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {selectedProducts.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selected Products:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedProducts.length} products selected
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsBatchDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBatch}
              disabled={isCreatingBatch || selectedProducts.length === 0 || !newBatch.location}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCreatingBatch ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Batch...
                </>
              ) : (
                'Create Batch'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerDashboard;