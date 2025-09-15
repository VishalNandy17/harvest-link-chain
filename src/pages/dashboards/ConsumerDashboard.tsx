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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { QrCode, Search, ShieldCheck, Star, ThumbsUp, Leaf, Clock, Truck, History, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ConsumerDashboard = () => {
  const { user, profile, userRole, loading } = useAuth();
  const navigate = useNavigate();
  
  // Ensure this dashboard is only accessible to consumers
  useEffect(() => {
    // Only redirect if we're not loading and the user role doesn't match
    if (!loading && userRole !== UserRole.CONSUMER && userRole !== UserRole.ADMIN) {
      // Redirect to appropriate dashboard based on role
      navigate('/', { replace: true });
    }
  }, [userRole, loading, navigate]);
  
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [rating, setRating] = useState(5);
  
  // Mock data for demonstration
  const recentScans = [
    { 
      id: 1, 
      product: 'Organic Wheat Flour', 
      brand: 'Nature Harvest',
      scannedDate: '2023-10-25', 
      farmer: 'Ramesh Kumar', 
      origin: 'Madhya Pradesh', 
      harvestDate: '2023-09-15',
      farmerShare: '80%',
      verified: true,
      journey: [
        { stage: 'Farm', location: 'Madhya Pradesh', date: '2023-09-15' },
        { stage: 'Processing', location: 'Agri Distributors', date: '2023-09-20' },
        { stage: 'Retail', location: 'Fresh Markets', date: '2023-09-25' }
      ]
    },
    { 
      id: 2, 
      product: 'Premium Basmati Rice', 
      brand: 'Golden Fields',
      scannedDate: '2023-10-20', 
      farmer: 'Suresh Patel', 
      origin: 'Punjab', 
      harvestDate: '2023-09-10',
      farmerShare: '75%',
      verified: true,
      journey: [
        { stage: 'Farm', location: 'Punjab', date: '2023-09-10' },
        { stage: 'Processing', location: 'Fresh Distributors', date: '2023-09-15' },
        { stage: 'Retail', location: 'City Grocers', date: '2023-09-20' }
      ]
    },
  ];

  const savedProducts = [
    { 
      id: 101, 
      product: 'Organic Wheat Flour', 
      brand: 'Nature Harvest',
      purchaseDate: '2023-10-25', 
      expiryDate: '2024-01-25',
      rating: 5
    },
    { 
      id: 102, 
      product: 'Premium Basmati Rice', 
      brand: 'Golden Fields',
      purchaseDate: '2023-10-20', 
      expiryDate: '2024-02-20',
      rating: 4
    },
    { 
      id: 103, 
      product: 'Fresh Tomatoes', 
      brand: 'Farm Fresh',
      purchaseDate: '2023-10-15', 
      expiryDate: '2023-10-30',
      rating: 3
    },
  ];

  const scanQRCode = () => {
    setIsQRScannerOpen(true);
    // In a real app, this would activate the camera for QR scanning
  };

  const viewProductDetails = (product: any) => {
    setCurrentProduct(product);
    setIsProductDetailOpen(true);
  };

  const openFeedbackForm = (product: any) => {
    setCurrentProduct(product);
    setIsFeedbackOpen(true);
  };

  const submitFeedback = () => {
    // In a real app, this would submit feedback to the database
    alert('Feedback submitted successfully!');
    setIsFeedbackOpen(false);
  };

  return (
    <ResponsiveContainer maxWidth="7xl" paddingX="0" paddingXMd="0">
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 md:p-6">
        <ResponsiveLayout 
          mobileDirection="col" 
          desktopDirection="row" 
          justify="between" 
          align="center" 
          className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-purple-800">Consumer Dashboard</h1>
            <p className="text-gray-600">Welcome back, {profile?.first_name} {profile?.last_name}</p>
          </div>
          <Button className="mt-4 md:mt-0 w-full md:w-auto bg-purple-600 hover:bg-purple-700" onClick={scanQRCode}>
            <QrCode className="mr-2 h-4 w-4" /> Scan QR Code
          </Button>
        </ResponsiveLayout>

        <ResponsiveGrid cols={1} colsMd={2} colsLg={4} gap="6" className="mb-8">
          <ResponsiveCard hoverable>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products Scanned</CardTitle>
              <QrCode className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">In the last 30 days</p>
            </CardContent>
          </ResponsiveCard>
          <ResponsiveCard hoverable>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Products</CardTitle>
              <ShieldCheck className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100%</div>
              <p className="text-xs text-muted-foreground">All products blockchain verified</p>
            </CardContent>
          </ResponsiveCard>
          <ResponsiveCard hoverable>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Farmer Share</CardTitle>
              <ThumbsUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78%</div>
              <p className="text-xs text-muted-foreground">Supporting fair trade</p>
            </CardContent>
          </ResponsiveCard>
          <ResponsiveCard hoverable>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Feedback Given</CardTitle>
              <Star className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">Your product reviews</p>
            </CardContent>
          </ResponsiveCard>
        </ResponsiveGrid>

        <Tabs defaultValue="scans" className="mb-8">
          <TabsList className="grid w-full grid-cols-3 gap-1 mb-4">
            <TabsTrigger value="scans">Recent Scans</TabsTrigger>
            <TabsTrigger value="saved">Saved Products</TabsTrigger>
            <TabsTrigger value="feedback">My Feedback</TabsTrigger>
          </TabsList>
          
          <TabsContent value="scans" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recently Scanned Products</CardTitle>
                <CardDescription>View detailed information about products you've scanned</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {recentScans.map((scan) => (
                    <ResponsiveCard key={scan.id} className="p-4 hover:bg-muted/50" hoverable>
                      <ResponsiveLayout mobileDirection="col" desktopDirection="row" justify="between" className="mb-4">
                        <div>
                          <div className="flex items-center flex-wrap">
                            <h3 className="font-medium text-lg mr-2">{scan.product}</h3>
                            {scan.verified && (
                              <Badge className="mt-1 md:mt-0 bg-green-500">Verified</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{scan.brand} • Scanned on {scan.scannedDate}</p>
                        </div>
                        <div className="mt-2 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => viewProductDetails(scan)}
                            className="w-full sm:w-auto"
                          >
                            <ShieldCheck className="h-3 w-3 mr-1" /> View Journey
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 w-full sm:w-auto"
                            onClick={() => setIsFeedbackOpen(true)}
                          >
                            <Star className="h-3 w-3 mr-1" /> Rate
                          </Button>
                        </div>
                       </ResponsiveLayout>
                      
                      <ResponsiveGrid cols={1} colsMd={3} gap="4">
                        <div className="flex items-center space-x-2">
                          <div className="bg-blue-100 p-1.5 rounded-full">
                            <Leaf className="h-4 w-4 text-blue-600" />
                          </div>
                           <div>
                             <p className="text-xs text-muted-foreground">Origin</p>
                             <p className="text-sm font-medium">{scan.origin}</p>
                           </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="bg-amber-100 p-1.5 rounded-full">
                            <Clock className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Harvested</p>
                            <p className="text-sm font-medium">{scan.harvestDate}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="bg-green-100 p-1.5 rounded-full">
                            <ThumbsUp className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Farmer's Share</p>
                            <p className="text-sm font-medium">{scan.farmerShare}</p>
                          </div>
                        </div>
                      </ResponsiveGrid>
                    </ResponsiveCard>
                  ))}
                  
                  <div className="flex justify-center">
                    <Button variant="outline" onClick={scanQRCode}>
                      <QrCode className="mr-2 h-4 w-4" /> Scan New Product
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="saved" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Saved Products</CardTitle>
                <CardDescription>Products you've saved to your profile</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {savedProducts.map((product) => (
                    <div key={product.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-lg hover:bg-muted/50">
                      <div>
                        <h3 className="font-medium">{product.product}</h3>
                        <p className="text-sm text-muted-foreground">{product.brand}</p>
                        <div className="flex items-center mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-3 w-3",
                                i < product.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-2 md:mt-0 text-right">
                        <p className="text-sm">Purchased: {product.purchaseDate}</p>
                        <p className="text-sm">Expires: {product.expiryDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <ResponsiveGrid cols={1} colsMd={2} gap="6">
              <Card>
                <CardHeader>
                  <CardTitle>Expiry Reminders</CardTitle>
                  <CardDescription>Products nearing their expiry date</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Fresh Tomatoes</span>
                        <span className="text-sm font-medium text-red-600">5 days left</span>
                      </div>
                      <Progress value={15} className="h-2 bg-red-100" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Organic Wheat Flour</span>
                        <span className="text-sm font-medium text-amber-600">3 months left</span>
                      </div>
                      <Progress value={60} className="h-2 bg-amber-100" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Premium Basmati Rice</span>
                        <span className="text-sm font-medium text-green-600">4 months left</span>
                      </div>
                      <Progress value={75} className="h-2 bg-green-100" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Shopping Recommendations</CardTitle>
                  <CardDescription>Based on your purchase history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-purple-100 p-2 rounded-full">
                          <Heart className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">Organic Vegetables</p>
                          <p className="text-sm text-muted-foreground">From verified farmers</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-purple-100 p-2 rounded-full">
                          <Heart className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">Seasonal Fruits</p>
                          <p className="text-sm text-muted-foreground">Fresh and local</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-purple-100 p-2 rounded-full">
                          <Heart className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">Whole Grains</p>
                          <p className="text-sm text-muted-foreground">High farmer share</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ResponsiveGrid>
          </TabsContent>
          
          <TabsContent value="feedback" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Product Feedback</CardTitle>
                <CardDescription>Reviews and ratings you've provided</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <ResponsiveCard className="p-4" hoverable>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">Organic Wheat Flour</h3>
                        <p className="text-sm text-muted-foreground">Nature Harvest • Reviewed on Oct 25, 2023</p>
                      </div>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 text-yellow-500 fill-yellow-500"
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm">"Excellent quality flour! I could really taste the difference in my chapatis. Knowing that the farmer received a fair share makes it even better."</p>
                  </ResponsiveCard>
                  
                  <ResponsiveCard className="p-4" hoverable>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">Premium Basmati Rice</h3>
                        <p className="text-sm text-muted-foreground">Golden Fields • Reviewed on Oct 20, 2023</p>
                      </div>
                      <div className="flex">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 text-yellow-500 fill-yellow-500"
                          />
                        ))}
                        {Array.from({ length: 1 }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 text-gray-300"
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm">"Good quality rice with nice aroma. Grains remain separate after cooking. Would have given 5 stars but a few broken grains were present."</p>
                  </ResponsiveCard>
                  
                  <ResponsiveCard className="p-4" hoverable>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">Fresh Tomatoes</h3>
                        <p className="text-sm text-muted-foreground">Farm Fresh • Reviewed on Oct 15, 2023</p>
                      </div>
                      <div className="flex">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 text-yellow-500 fill-yellow-500"
                          />
                        ))}
                        {Array.from({ length: 2 }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 text-gray-300"
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm">"The tomatoes were fresh but ripened too quickly. I appreciate being able to trace them back to the farmer though."</p>
                  </ResponsiveCard>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Dialogs */}
        <Dialog open={isQRScannerOpen} onOpenChange={setIsQRScannerOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Scan QR Code</DialogTitle>
              <DialogDescription>
                Scan a QR code to verify product authenticity and view its journey.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <div className="w-64 h-64 bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-400 rounded-md">
                <Search className="h-12 w-12 text-gray-400" />
                <p className="text-gray-500 text-center">Camera access required</p>
              </div>
              <p className="text-sm text-muted-foreground">Position the QR code within the frame to scan</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsQRScannerOpen(false)} variant="outline">Cancel</Button>
              <Button onClick={() => {
                setIsQRScannerOpen(false);
                // Simulate a successful scan
                viewProductDetails(recentScans[0]);
              }}>Scan Manually</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isProductDetailOpen} onOpenChange={setIsProductDetailOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Product Journey</DialogTitle>
              <DialogDescription>
                Farm-to-fork journey visualization with blockchain verification.
              </DialogDescription>
            </DialogHeader>
            {currentProduct && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div>
                    <h2 className="text-xl font-bold">{currentProduct.product}</h2>
                    <p className="text-muted-foreground">{currentProduct.brand}</p>
                  </div>
                  <Badge className="mt-2 md:mt-0 bg-green-500">Blockchain Verified</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-3">
                    <p className="text-sm font-medium text-muted-foreground">Origin</p>
                    <p className="font-medium">{currentProduct.origin}</p>
                    <p className="text-sm">{currentProduct.farmer} (Farmer)</p>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <p className="text-sm font-medium text-muted-foreground">Harvest Date</p>
                    <p className="font-medium">{currentProduct.harvestDate}</p>
                    <p className="text-sm">Quality: Premium</p>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <p className="text-sm font-medium text-muted-foreground">Farmer's Share</p>
                    <p className="font-medium">{currentProduct.farmerShare}</p>
                    <p className="text-sm">Fair Trade Certified</p>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Complete Product Journey</h3>
                  
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 z-0"></div>
                    
                    {currentProduct.journey && currentProduct.journey.map((step: any, index: number) => (
                      <div key={index} className="relative z-10 flex mb-6 last:mb-0">
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full mr-4",
                          index === 0 ? "bg-green-100 text-green-600" : 
                          index === 1 ? "bg-blue-100 text-blue-600" :
                          "bg-purple-100 text-purple-600"
                        )}>
                          {index + 1}
                        </div>
                        <div className={cn(
                          "rounded-lg p-3 flex-grow",
                          index === 0 ? "bg-green-50" : 
                          index === 1 ? "bg-blue-50" :
                          "bg-purple-50"
                        )}>
                          <p className="font-medium">{step.stage}</p>
                          <p className="text-sm">{step.location}</p>
                          <p className="text-sm text-muted-foreground">{step.date}</p>
                          
                          {index === 0 && (
                            <div className="mt-2 flex items-center">
                              <Badge variant="outline" className="border-green-500 text-green-600 mr-2">Organic</Badge>
                              <Badge variant="outline" className="border-green-500 text-green-600">Pesticide-Free</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <div className="relative z-10 flex">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 mr-4">
                        {currentProduct.journey ? currentProduct.journey.length + 1 : 4}
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 flex-grow">
                        <p className="font-medium">Consumer</p>
                        <p className="text-sm">You</p>
                        <p className="text-sm text-muted-foreground">{currentProduct.scannedDate}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-4 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Blockchain Verification</p>
                  <p className="text-xs font-mono break-all">0x7f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d</p>
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
              <Button onClick={() => setIsProductDetailOpen(false)} variant="outline">Close</Button>
              <Button onClick={() => {
                setIsProductDetailOpen(false);
                setIsFeedbackOpen(true);
              }} className="bg-purple-600 hover:bg-purple-700">Rate Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rate & Review</DialogTitle>
              <DialogDescription>
                Share your experience with this product.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rating" className="text-center block mb-2">Rating</Label>
                <div className="flex justify-center space-x-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-8 w-8 cursor-pointer",
                        i < rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                      )}
                      onClick={() => setRating(i + 1)}
                    />
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="review">Your Review</Label>
                <Textarea id="review" placeholder="Share your experience with this product..." rows={4} />
              </div>
              
              <div className="space-y-2">
                <Label>Quality Aspects</Label>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Freshness</span>
                      <span className="text-sm">{rating}/5</span>
                    </div>
                    <Slider
                      defaultValue={[rating]}
                      max={5}
                      step={1}
                      onValueChange={(value) => {}}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Taste</span>
                      <span className="text-sm">{rating}/5</span>
                    </div>
                    <Slider
                      defaultValue={[rating]}
                      max={5}
                      step={1}
                      onValueChange={(value) => {}}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Value for Money</span>
                      <span className="text-sm">{rating}/5</span>
                    </div>
                    <Slider
                      defaultValue={[rating]}
                      max={5}
                      step={1}
                      onValueChange={(value) => {}}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsFeedbackOpen(false)} variant="outline">Cancel</Button>
              <Button onClick={submitFeedback} className="bg-purple-600 hover:bg-purple-700">Submit Feedback</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResponsiveContainer>
  );
};

export default ConsumerDashboard;