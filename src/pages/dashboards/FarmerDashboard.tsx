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
import { CalendarIcon, Tractor, TrendingUp, QrCode, Leaf, BarChart3, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const FarmerDashboard = () => {
  const { user, profile, userRole, loading } = useAuth();
  const navigate = useNavigate();
  
  // Ensure this dashboard is only accessible to farmers
  useEffect(() => {
    // Only redirect if we're not loading and the user role doesn't match
    if (!loading && userRole !== UserRole.FARMER && userRole !== UserRole.ADMIN) {
      // Redirect to appropriate dashboard based on role
      navigate('/', { replace: true });
    }
  }, [userRole, loading, navigate]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [currentQRCode, setCurrentQRCode] = useState('');
  
  // Mock data for demonstration
  const recentProduceListings = [
    { id: 1, crop: 'Wheat', quantity: '500 kg', date: '2023-10-15', status: 'Listed', price: '₹20/kg' },
    { id: 2, crop: 'Rice', quantity: '300 kg', date: '2023-10-10', status: 'Sold', price: '₹35/kg' },
    { id: 3, crop: 'Tomatoes', quantity: '100 kg', date: '2023-10-05', status: 'In Transit', price: '₹15/kg' },
  ];

  const earnings = {
    total: '₹42,500',
    pending: '₹10,000',
    thisMonth: '₹15,500',
    lastMonth: '₹27,000'
  };

  const cropAdvisory = [
    { crop: 'Wheat', recommendation: 'Ideal planting time in 2 weeks', confidence: 'High' },
    { crop: 'Pulses', recommendation: 'Market demand increasing', confidence: 'Medium' },
    { crop: 'Vegetables', recommendation: 'Consider greenhouse cultivation', confidence: 'High' },
  ];

  const generateQRCode = (produceId: number) => {
    // In a real app, this would generate a QR code with blockchain verification data
    // For demo purposes, we're just setting a placeholder
    setCurrentQRCode(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=produce_${produceId}_verification`);
    setIsQRDialogOpen(true);
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
          </div>
          <Button className="mt-4 md:mt-0 bg-green-600 hover:bg-green-700">
            <Leaf className="mr-2 h-4 w-4" /> View Crop Calendar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{earnings.total}</div>
              <p className="text-xs text-muted-foreground">+18% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
              <Tractor className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">3 pending verification</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Market Demand</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">High</div>
              <p className="text-xs text-muted-foreground">Wheat, Rice, Pulses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Forecast</CardTitle>
              <BarChart3 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹55,000</div>
              <p className="text-xs text-muted-foreground">Expected next month</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="listings" className="mb-8">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="listings">My Produce</TabsTrigger>
            <TabsTrigger value="add">Add New Produce</TabsTrigger>
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
          
          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>Add New Produce</CardTitle>
                <CardDescription>List your new harvest for distributors</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProduceSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="crop-type">Crop Type</Label>
                      <Select>
                        <SelectTrigger id="crop-type">
                          <SelectValue placeholder="Select crop type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wheat">Wheat</SelectItem>
                          <SelectItem value="rice">Rice</SelectItem>
                          <SelectItem value="corn">Corn</SelectItem>
                          <SelectItem value="tomatoes">Tomatoes</SelectItem>
                          <SelectItem value="potatoes">Potatoes</SelectItem>
                          <SelectItem value="onions">Onions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <div className="flex space-x-2">
                        <Input id="quantity" type="number" placeholder="Amount" />
                        <Select defaultValue="kg">
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="ton">ton</SelectItem>
                            <SelectItem value="quintal">quintal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="harvest-date">Harvest Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="quality">Quality Grade</Label>
                      <Select>
                        <SelectTrigger id="quality">
                          <SelectValue placeholder="Select quality grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="economy">Economy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="price">Expected Price (per unit)</Label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                          ₹
                        </span>
                        <Input id="price" type="number" className="rounded-l-none" placeholder="0.00" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea id="notes" placeholder="Any special information about this produce..." />
                  </div>
                  
                  <div className="pt-4">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700 w-full md:w-auto">
                      List Produce with Blockchain Verification
                    </Button>
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
      
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produce QR Code</DialogTitle>
            <DialogDescription>
              This QR code contains blockchain-verified information about your produce.
              Distributors and consumers can scan this to verify authenticity.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <img src={currentQRCode} alt="QR Code" className="w-48 h-48" />
          </div>
          <DialogFooter>
            <Button onClick={() => setIsQRDialogOpen(false)}>Close</Button>
            <Button variant="outline">Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerDashboard;