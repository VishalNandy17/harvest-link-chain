import { useState, useEffect } from 'react';
import { ResponsiveContainer, ResponsiveGrid, ResponsiveCard, ResponsiveLayout } from '@/components/ui/responsive';
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
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Package, TrendingUp, QrCode, BarChart3, DollarSign, ShieldCheck, Search, ShoppingCart, Truck, History } from 'lucide-react';
import { 
  purchaseBatch, 
  verifyProduct, 
  generateProductQRCode,
  generateQRCodeDataURL,
  parseQRCodeData,
  type Product
} from '@/lib/blockchain';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { supabase } from '@/integrations/supabase/client';

const RetailerDashboard = () => {
  const { user, profile, userRole, loading } = useAuth();
  const navigate = useNavigate();
  
  // Ensure this dashboard is only accessible to retailers
  useEffect(() => {
    // Only redirect if we're not loading and the user role doesn't match
    if (!loading && userRole !== UserRole.RETAILER && userRole !== UserRole.ADMIN) {
      // Redirect to appropriate dashboard based on role
      navigate('/', { replace: true });
    }
  }, [userRole, loading, navigate]);
  
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [currentQRData, setCurrentQRData] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    message: string;
    product?: Product;
    owners?: string[];
  } | null>(null);
  
  // Mock data for demonstration
  const inventoryItems = [
    { 
      id: 1, 
      product: 'Wheat Flour', 
      quantity: '200 kg', 
      source: 'Ramesh Kumar (Farmer) → Agri Distributors', 
      purchaseDate: '2023-10-20', 
      expiryDate: '2024-01-20',
      price: '₹25/kg',
      verified: true,
      farmerShare: '80%'
    },
    { 
      id: 2, 
      product: 'Basmati Rice', 
      quantity: '150 kg', 
      source: 'Suresh Patel (Farmer) → Fresh Distributors', 
      purchaseDate: '2023-10-15', 
      expiryDate: '2024-02-15',
      price: '₹40/kg',
      verified: true,
      farmerShare: '75%'
    },
    { 
      id: 3, 
      product: 'Fresh Tomatoes', 
      quantity: '50 kg', 
      source: 'Mahesh Singh (Farmer) → Local Distributors', 
      purchaseDate: '2023-10-25', 
      expiryDate: '2023-11-05',
      price: '₹20/kg',
      verified: false,
      farmerShare: '70%'
    },
  ];

  const pendingPayments = [
    { id: 101, distributor: 'Agri Distributors', amount: '₹5,000', dueDate: '2023-11-05', items: 'Wheat Flour (200 kg)' },
    { id: 102, distributor: 'Fresh Distributors', amount: '₹6,000', dueDate: '2023-11-10', items: 'Basmati Rice (150 kg)' },
  ];

  const verifyProductById = async (productId: number) => {
    try {
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
    }
  };

  const verifyProductByItem = (product: any) => {
    setCurrentProduct(product);
    setIsVerifyDialogOpen(true);
    // In a real app, this would verify the blockchain record
  };

  const initiatePayment = async (paymentId: number) => {
    try {
      // In a real app, this would call the purchaseBatch function
      // For now, we'll simulate the payment
      await purchaseBatch(paymentId, '1000000000000000000'); // 1 ETH in wei
      setIsPaymentDialogOpen(true);
    } catch (error) {
      console.error('Error initiating payment:', error);
    }
  };

  const generateProductQR = async (productId: number) => {
    try {
      const qrData = generateProductQRCode(productId);
      setCurrentQRData(qrData);
      setIsQRDialogOpen(true);
    } catch (error) {
      console.error('Error generating product QR code:', error);
    }
  };

  const handleQRScan = (data: string) => {
    try {
      const parsed = parseQRCodeData(data);
      if (parsed.type === 'product' && parsed.id) {
        verifyProductById(parsed.id);
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
    }
  };

  const updateInventory = (productId: number, action: 'add' | 'remove', quantity: number) => {
    // In a real app, this would update the inventory in the database
    alert(`Inventory ${action}ed successfully!`);
  };

  return (
    <ResponsiveContainer maxWidth="7xl" paddingX="0" paddingXMd="0">
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4 md:p-6">
        <ResponsiveLayout 
          mobileDirection="col" 
          desktopDirection="row" 
          justify="between" 
          align="center" 
          className="mb-8"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-green-800">Retailer Dashboard</h1>
            <p className="text-gray-600">Welcome back, {profile?.first_name} {profile?.last_name}</p>
          </div>
          <Button className="mt-4 md:mt-0 w-full md:w-auto bg-green-600 hover:bg-green-700">
            <ShoppingCart className="mr-2 h-4 w-4" /> New Order
          </Button>
        </ResponsiveLayout>

        <ResponsiveGrid cols={1} colsMd={2} colsLg={4} gap="6" className="mb-8">
          <ResponsiveCard fullWidthOnMobile>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">400 kg</div>
              <p className="text-xs text-muted-foreground">Across 5 product categories</p>
            </CardContent>
          </ResponsiveCard>
          <ResponsiveCard fullWidthOnMobile>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Truck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Expected within 2 days</p>
            </CardContent>
          </ResponsiveCard>
          <ResponsiveCard fullWidthOnMobile>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales Forecast</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12%</div>
              <p className="text-xs text-muted-foreground">Compared to last month</p>
            </CardContent>
          </ResponsiveCard>
          <ResponsiveCard fullWidthOnMobile>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹11,000</div>
              <p className="text-xs text-muted-foreground">Due this week</p>
            </CardContent>
          </ResponsiveCard>
        </ResponsiveGrid>

        <Tabs defaultValue="inventory" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="supply-chain">Supply Chain</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="insights">Demand Insights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Management</CardTitle>
                <CardDescription>Track and manage your product inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="hidden md:block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Product</th>
                          <th className="text-left py-3 px-2">Quantity</th>
                          <th className="text-left py-3 px-2">Source</th>
                          <th className="text-left py-3 px-2">Purchase Date</th>
                          <th className="text-left py-3 px-2">Expiry Date</th>
                          <th className="text-left py-3 px-2">Price</th>
                          <th className="text-left py-3 px-2">Verification</th>
                          <th className="text-left py-3 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryItems.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-2">{item.product}</td>
                            <td className="py-3 px-2">{item.quantity}</td>
                            <td className="py-3 px-2">{item.source}</td>
                            <td className="py-3 px-2">{item.purchaseDate}</td>
                            <td className="py-3 px-2">{item.expiryDate}</td>
                            <td className="py-3 px-2">{item.price}</td>
                            <td className="py-3 px-2">
                              {item.verified ? (
                                <Badge className="bg-green-500">Verified</Badge>
                              ) : (
                                <Badge variant="outline" className="border-orange-500 text-orange-500">Pending</Badge>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => verifyProductByItem(item)}
                                className="mr-2"
                              >
                                <ShieldCheck className="h-3 w-3 mr-1" /> Verify
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => generateProductQR(item.id)}
                                className="mr-2"
                              >
                                <QrCode className="h-3 w-3 mr-1" /> QR Code
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="mr-2"
                                onClick={() => updateInventory(item.id, 'remove', 10)}
                              >
                                Update
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile view for inventory items */}
                  <div className="md:hidden space-y-4">
                    {inventoryItems.map((item) => (
                      <ResponsiveCard key={item.id} fullWidthOnMobile className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{item.product}</h3>
                            <p className="text-sm text-muted-foreground">{item.quantity} at {item.price}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Button className="w-full md:w-auto" type="button">
                              Add to Inventory
                            </Button>
                            {item.verified ? (
                              <Badge className="bg-green-500">Verified</Badge>
                            ) : (
                              <Badge variant="outline" className="border-orange-500 text-orange-500">Pending</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <p className="text-muted-foreground">Source:</p>
                            <p className="truncate">{item.source}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Purchase:</p>
                            <p>{item.purchaseDate}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Expiry:</p>
                            <p>{item.expiryDate}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Farmer Share:</p>
                            <p>{item.farmerShare}</p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => verifyProductByItem(item)}
                            className="flex-1"
                          >
                            <ShieldCheck className="h-3 w-3 mr-1" /> Verify
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                            onClick={() => updateInventory(item.id, 'remove', 10)}
                          >
                            Update
                          </Button>
                        </div>
                      </ResponsiveCard>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <ResponsiveGrid cols={1} colsMd={2} gap="6">
              <ResponsiveCard fullWidthOnMobile>
                <CardHeader>
                  <CardTitle>Low Stock Alert</CardTitle>
                  <CardDescription>Products that need to be restocked soon</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Fresh Tomatoes</span>
                        <span className="text-sm font-medium text-red-600">Critical</span>
                      </div>
                      <Progress value={15} className="h-2 bg-red-100" />
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>Current: 50kg</span>
                        <span>Minimum: 100kg</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Basmati Rice</span>
                        <span className="text-sm font-medium text-amber-600">Warning</span>
                      </div>
                      <Progress value={35} className="h-2 bg-amber-100" />
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>Current: 150kg</span>
                        <span>Minimum: 200kg</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Wheat Flour</span>
                        <span className="text-sm font-medium text-green-600">Good</span>
                      </div>
                      <Progress value={65} className="h-2 bg-green-100" />
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>Current: 200kg</span>
                        <span>Minimum: 150kg</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </ResponsiveCard>
              
              <ResponsiveCard fullWidthOnMobile>
                <CardHeader>
                  <CardTitle>Add New Inventory</CardTitle>
                  <CardDescription>Record new products in your inventory</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="product">Product</Label>
                        <Select>
                          <SelectTrigger id="product">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="wheat-flour">Wheat Flour</SelectItem>
                            <SelectItem value="basmati-rice">Basmati Rice</SelectItem>
                            <SelectItem value="fresh-tomatoes">Fresh Tomatoes</SelectItem>
                            <SelectItem value="potatoes">Potatoes</SelectItem>
                            <SelectItem value="onions">Onions</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity (kg)</Label>
                        <Input id="quantity" type="number" placeholder="Enter quantity" />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="distributor">Distributor</Label>
                        <Select>
                          <SelectTrigger id="distributor">
                            <SelectValue placeholder="Select distributor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agri-distributors">Agri Distributors</SelectItem>
                            <SelectItem value="fresh-distributors">Fresh Distributors</SelectItem>
                            <SelectItem value="local-distributors">Local Distributors</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input id="expiry" type="date" />
                      </div>
                    </div>
                    
                    <Button className="w-full md:w-auto bg-green-600 hover:bg-green-700" type="button">
                      Add to Inventory
                    </Button>
                  </form>
                </CardContent>
              </ResponsiveCard>
            </ResponsiveGrid>
          </TabsContent>
          
          <TabsContent value="supply-chain" className="space-y-4">
            <ResponsiveCard fullWidthOnMobile>
              <CardHeader>
                <CardTitle>Supply Chain Verification</CardTitle>
                <CardDescription>Verify the complete journey of your products</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {inventoryItems.map((item) => (
                    <ResponsiveCard key={item.id} fullWidthOnMobile className="p-4 hover:bg-muted/50">
                      <ResponsiveLayout mobileDirection="col" desktopDirection="row" justify="between" className="mb-4">
                        <div>
                          <h3 className="font-medium text-lg">{item.product}</h3>
                          <p className="text-sm text-muted-foreground">{item.quantity} • Purchased on {item.purchaseDate}</p>
                        </div>
                        <div className="mt-2 md:mt-0">
                          {item.verified ? (
                            <Badge className="bg-green-500">Blockchain Verified</Badge>
                          ) : (
                            <Badge variant="outline" className="border-orange-500 text-orange-500">Verification Pending</Badge>
                          )}
                        </div>
                      </ResponsiveLayout>
                      
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 z-0"></div>
                        
                        <div className="relative z-10 flex mb-6">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 mr-4">
                            1
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 flex-grow">
                            <p className="font-medium">Farm Origin</p>
                            <p className="text-sm">Farmer: {item.source.split('→')[0].trim()}</p>
                            <p className="text-sm text-muted-foreground">Harvested on: {new Date(new Date(item.purchaseDate).getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}</p>
                          </div>
                        </div>
                        
                        <div className="relative z-10 flex mb-6">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-4">
                            2
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3 flex-grow">
                            <p className="font-medium">Distributor</p>
                            <p className="text-sm">{item.source.split('→')[1].trim()}</p>
                            <p className="text-sm text-muted-foreground">Processed on: {new Date(new Date(item.purchaseDate).getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}</p>
                          </div>
                        </div>
                        
                        <div className="relative z-10 flex">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 mr-4">
                            3
                          </div>
                          <div className="bg-purple-50 rounded-lg p-3 flex-grow">
                            <p className="font-medium">Retail Arrival</p>
                            <p className="text-sm">Your Store</p>
                            <p className="text-sm text-muted-foreground">Received on: {item.purchaseDate}</p>
                          </div>
                        </div>
                      </div>
                      
                      <ResponsiveLayout mobileDirection="col" desktopDirection="row" justify="between" align="center" className="mt-4 gap-4">
                        <div>
                          <p className="text-sm font-medium">Farmer's Fair Share: {item.farmerShare}</p>
                          <p className="text-xs text-muted-foreground">Blockchain verified payment distribution</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => verifyProduct(item)}
                          className="w-full md:w-auto"
                        >
                          <ShieldCheck className="h-3 w-3 mr-1" /> View Blockchain Record
                        </Button>
                      </ResponsiveLayout>
                    </ResponsiveCard>
                  ))}
                </div>
              </CardContent>
            </ResponsiveCard>
          </TabsContent>
          
          <TabsContent value="payments" className="space-y-4">
            <ResponsiveCard fullWidthOnMobile>
              <CardHeader>
                <CardTitle>Pending Payments</CardTitle>
                <CardDescription>Smart contract settlements with distributors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  {/* Desktop view */}
                  <div className="hidden md:block">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Distributor</th>
                          <th className="text-left py-3 px-2">Amount</th>
                          <th className="text-left py-3 px-2">Due Date</th>
                          <th className="text-left py-3 px-2">Items</th>
                          <th className="text-left py-3 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingPayments.map((payment) => (
                          <tr key={payment.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-2">{payment.distributor}</td>
                            <td className="py-3 px-2">{payment.amount}</td>
                            <td className="py-3 px-2">{payment.dueDate}</td>
                            <td className="py-3 px-2">{payment.items}</td>
                            <td className="py-3 px-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => initiatePayment(payment.id)}
                                className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                              >
                                <DollarSign className="h-3 w-3 mr-1" /> Pay Now
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile view */}
                  <div className="md:hidden space-y-4">
                    {pendingPayments.map((payment) => (
                      <ResponsiveCard key={payment.id} fullWidthOnMobile className="p-4">
                        <ResponsiveLayout mobileDirection="col" className="gap-3">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-medium">{payment.distributor}</h3>
                              <p className="text-sm text-muted-foreground">{payment.items}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{payment.amount}</p>
                              <p className="text-sm text-muted-foreground">Due: {payment.dueDate}</p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => initiatePayment(payment.id)}
                            className="w-full bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                          >
                            <DollarSign className="h-3 w-3 mr-1" /> Pay Now
                          </Button>
                        </ResponsiveLayout>
                      </ResponsiveCard>
                    ))}
                  </div>
                </div>
              </CardContent>
            </ResponsiveCard>
            
            <ResponsiveCard fullWidthOnMobile>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Recent transactions and settlements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-2 rounded-full mr-3">
                        <History className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Agri Distributors</p>
                        <p className="text-sm text-muted-foreground">Wheat Flour (300 kg)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹7,500</p>
                      <p className="text-sm text-muted-foreground">Oct 10, 2023</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-2 rounded-full mr-3">
                        <History className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Fresh Distributors</p>
                        <p className="text-sm text-muted-foreground">Basmati Rice (200 kg)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹8,000</p>
                      <p className="text-sm text-muted-foreground">Oct 5, 2023</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-2 rounded-full mr-3">
                        <History className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Local Distributors</p>
                        <p className="text-sm text-muted-foreground">Fresh Tomatoes (100 kg)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹2,000</p>
                      <p className="text-sm text-muted-foreground">Sep 28, 2023</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </ResponsiveCard>
          </TabsContent>
          
          <TabsContent value="insights" className="space-y-4">
            <ResponsiveCard fullWidthOnMobile>
              <CardHeader>
                <CardTitle>Demand Insights</CardTitle>
                <CardDescription>AI-powered forecasts and market trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium text-lg mb-2">Seasonal Demand Forecast</h3>
                    <ResponsiveGrid cols={1} colsMd={3} gap="4" className="mb-4">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="font-medium">Wheat Flour</p>
                        <p className="text-xl md:text-2xl font-bold text-green-600">+15%</p>
                        <p className="text-sm text-muted-foreground">Expected increase in next 30 days</p>
                      </div>
                      
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <p className="font-medium">Basmati Rice</p>
                        <p className="text-xl md:text-2xl font-bold text-amber-600">+5%</p>
                        <p className="text-sm text-muted-foreground">Expected increase in next 30 days</p>
                      </div>
                      
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="font-medium">Fresh Tomatoes</p>
                        <p className="text-xl md:text-2xl font-bold text-red-600">-10%</p>
                        <p className="text-sm text-muted-foreground">Expected decrease in next 30 days</p>
                      </div>
                    </ResponsiveGrid>
                    <p className="text-sm text-muted-foreground">Based on historical data, seasonal patterns, and current market trends</p>
                  </div>
                  
                  <ResponsiveCard className="border rounded-lg p-4">
                    <h3 className="font-medium text-lg mb-2">Recommended Actions</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <div className="bg-green-100 p-1 rounded-full mr-2 mt-0.5">
                          <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm">Increase Wheat Flour stock by at least 100kg before the festival season</p>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-green-100 p-1 rounded-full mr-2 mt-0.5">
                          <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm">Consider promotional pricing for Fresh Tomatoes to prevent wastage</p>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-green-100 p-1 rounded-full mr-2 mt-0.5">
                          <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm">Maintain current Basmati Rice inventory levels with small incremental orders</p>
                      </li>
                    </ul>
                  </ResponsiveCard>
                  
                  <ResponsiveCard className="border rounded-lg p-4">
                    <h3 className="font-medium text-lg mb-2">Market Price Trends</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Wheat Flour</span>
                          <span className="text-sm font-medium text-green-600">₹25/kg (↑2%)</span>
                        </div>
                        <Progress value={75} className="h-2 bg-green-100" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Basmati Rice</span>
                          <span className="text-sm font-medium text-amber-600">₹40/kg (↑1%)</span>
                        </div>
                        <Progress value={60} className="h-2 bg-amber-100" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Fresh Tomatoes</span>
                          <span className="text-sm font-medium text-red-600">₹20/kg (↓5%)</span>
                        </div>
                        <Progress value={40} className="h-2 bg-red-100" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">Prices compared to 30-day average</p>
                  </ResponsiveCard>
                </div>
              </CardContent>
            </ResponsiveCard>
          </TabsContent>
        </Tabs>
        
        {/* Dialogs */}
        <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supply Chain Verification</DialogTitle>
              <DialogDescription>
                Complete blockchain record for this product's journey from farm to retail.
              </DialogDescription>
            </DialogHeader>
            {currentProduct && (
              <div className="space-y-4">
                <ResponsiveGrid cols={1} colsMd={2} gap="4">
                  <div>
                    <p className="text-sm font-medium">Product</p>
                    <p>{currentProduct.product}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Source</p>
                    <p>{currentProduct.source}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Purchase Date</p>
                    <p>{currentProduct.purchaseDate}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Farmer's Share</p>
                    <p>{currentProduct.farmerShare}</p>
                  </div>
                </ResponsiveGrid>
                
                <div className="border rounded-md p-4 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Blockchain Verification</p>
                  <p className="text-xs font-mono break-all">0x7f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between">
                      <p className="text-xs">Farm Transaction:</p>
                      <p className="text-xs font-mono">0x1a2b3c4d5e...</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-xs">Distributor Transaction:</p>
                      <p className="text-xs font-mono">0x6f7e8d9c0b...</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-xs">Retail Transaction:</p>
                      <p className="text-xs font-mono">0x2c3d4e5f6g...</p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-4 bg-green-50">
                  <div className="flex items-center">
                    <ShieldCheck className="h-5 w-5 text-green-600 mr-2" />
                    <p className="text-sm font-medium text-green-600">Verified Authentic Product</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">This product has been verified through our blockchain system and confirmed to be authentic with complete traceability.</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsVerifyDialogOpen(false)} variant="outline" className="w-full md:w-auto">Close</Button>
              <Button onClick={() => {
                setIsVerifyDialogOpen(false);
                // In a real app, this would download the verification certificate
              }} className="w-full md:w-auto bg-green-600 hover:bg-green-700">Download Certificate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Smart Contract Payment</DialogTitle>
              <DialogDescription>
                Complete payment to distributor with blockchain verification.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <ResponsiveGrid cols={1} colsMd={2} gap="4">
                <div>
                  <p className="text-sm font-medium">Distributor</p>
                  <p>Agri Distributors</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Amount</p>
                  <p>₹5,000</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Items</p>
                  <p>Wheat Flour (200 kg)</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Due Date</p>
                  <p>2023-11-05</p>
                </div>
              </ResponsiveGrid>
              
              <div className="border rounded-md p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">Payment Breakdown</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="text-sm">Distributor Share:</p>
                    <p className="text-sm">₹1,000 (20%)</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm">Farmer Share:</p>
                    <p className="text-sm">₹4,000 (80%)</p>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                    <p>Total:</p>
                    <p>₹5,000</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select>
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsPaymentDialogOpen(false)} variant="outline" className="w-full md:w-auto">Cancel</Button>
              <Button onClick={() => {
                setIsPaymentDialogOpen(false);
                alert('Payment completed successfully!');
              }} className="w-full md:w-auto bg-green-600 hover:bg-green-700">Confirm Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <QRCodeGenerator
          data={currentQRData}
          title="Product QR Code"
          description="This QR code contains blockchain-verified information about the product. Consumers can scan this to verify authenticity and view the complete supply chain journey."
          showDialog={isQRDialogOpen}
          onClose={() => setIsQRDialogOpen(false)}
        />
      </div>
    </ResponsiveContainer>
  );
};

export default RetailerDashboard;