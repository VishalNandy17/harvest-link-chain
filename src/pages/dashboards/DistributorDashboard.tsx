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
import { Package, TrendingUp, QrCode, Truck, BarChart3, DollarSign, ShieldCheck, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const DistributorDashboard = () => {
  const { user, profile, userRole, loading } = useAuth();
  const navigate = useNavigate();
  
  // Ensure this dashboard is only accessible to distributors
  useEffect(() => {
    // Only redirect if we're not loading and the user role doesn't match
    if (!loading && userRole !== UserRole.DISTRIBUTOR && userRole !== UserRole.ADMIN) {
      // Redirect to appropriate dashboard based on role
      navigate('/', { replace: true });
    }
  }, [userRole, loading, navigate]);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [currentProduce, setCurrentProduce] = useState<any>(null);
  
  // Mock data for demonstration
  const availableProduce = [
    { id: 1, crop: 'Wheat', farmer: 'Ramesh Kumar', quantity: '500 kg', harvestDate: '2023-10-15', quality: 'Premium', price: '₹20/kg', verified: true },
    { id: 2, crop: 'Rice', farmer: 'Suresh Patel', quantity: '300 kg', harvestDate: '2023-10-10', quality: 'Standard', price: '₹35/kg', verified: true },
    { id: 3, crop: 'Tomatoes', farmer: 'Mahesh Singh', quantity: '100 kg', harvestDate: '2023-10-05', quality: 'Premium', price: '₹15/kg', verified: false },
  ];

  const procuredProduce = [
    { id: 101, crop: 'Wheat', farmer: 'Dinesh Sharma', quantity: '800 kg', purchaseDate: '2023-09-25', status: 'In Storage', destination: 'Central Warehouse' },
    { id: 102, crop: 'Potatoes', farmer: 'Rajesh Verma', quantity: '500 kg', purchaseDate: '2023-09-20', status: 'In Transit', destination: 'City Market' },
  ];

  const verifyProduce = (produce: any) => {
    setCurrentProduce(produce);
    setIsVerifyDialogOpen(true);
    // In a real app, this would verify the blockchain record
  };

  const handleProcurement = (produceId: number, action: 'accept' | 'reject') => {
    // In a real app, this would update the database and create a transaction
    alert(`Produce ${action}ed successfully!`);
  };

  const assignTransport = (produceId: number) => {
    // In a real app, this would open a dialog to assign transport
    alert('Transport assigned successfully!');
  };

  const scanQRCode = () => {
    setIsQRScannerOpen(true);
    // In a real app, this would activate the camera for QR scanning
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-800">Distributor Dashboard</h1>
            <p className="text-gray-600">Welcome back, {profile?.first_name} {profile?.last_name}</p>
          </div>
          <Button className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700" onClick={scanQRCode}>
            <QrCode className="mr-2 h-4 w-4" /> Scan QR Code
          </Button>
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
              <div className="text-2xl font-bold">₹1.2M</div>
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
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => assignTransport(item.id)}
                              >
                                <Truck className="h-3 w-3 mr-1" /> Assign Transport
                              </Button>
                            )}
                            {item.status === 'In Transit' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                              >
                                Track Shipment
                              </Button>
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
      
      <Dialog open={isQRScannerOpen} onOpenChange={setIsQRScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Scan a QR code to verify produce authenticity.
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
              verifyProduce(availableProduce[2]);
            }}>Scan Manually</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DistributorDashboard;