import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  BarChart, LineChart, PieChart, AreaChart, ResponsiveContainer,
  Bar, Line, Pie, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';
import { 
  BarChart as BarChartIcon, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  Leaf, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, profile, userRole, loading } = useAuth();
  const navigate = useNavigate();
  
  // Ensure this dashboard is only accessible to admins
  useEffect(() => {
    // Only redirect if we're not loading and the user role doesn't match
    if (!loading && userRole !== UserRole.admin) {
      // Redirect to appropriate dashboard based on role
      navigate('/', { replace: true });
    }
  }, [userRole, loading, navigate]);
  const [dateRange, setDateRange] = useState('30d');
  const [cropFilter, setCropFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  
  // Mock data for demonstration
  const marketTrends = [
    { date: 'Jan 2023', wheat: 2500, rice: 3000, vegetables: 1800, fruits: 2200 },
    { date: 'Feb 2023', wheat: 2700, rice: 2800, vegetables: 1900, fruits: 2300 },
    { date: 'Mar 2023', wheat: 2900, rice: 2600, vegetables: 2100, fruits: 2500 },
    { date: 'Apr 2023', wheat: 3100, rice: 2700, vegetables: 2300, fruits: 2700 },
    { date: 'May 2023', wheat: 3300, rice: 2900, vegetables: 2500, fruits: 2900 },
    { date: 'Jun 2023', wheat: 3500, rice: 3100, vegetables: 2700, fruits: 3100 },
    { date: 'Jul 2023', wheat: 3300, rice: 3300, vegetables: 2900, fruits: 3300 },
    { date: 'Aug 2023', wheat: 3100, rice: 3500, vegetables: 3100, fruits: 3500 },
    { date: 'Sep 2023', wheat: 2900, rice: 3700, vegetables: 3300, fruits: 3700 },
    { date: 'Oct 2023', wheat: 2700, rice: 3900, vegetables: 3500, fruits: 3900 },
    { date: 'Nov 2023', wheat: 2500, rice: 4100, vegetables: 3700, fruits: 4100 },
    { date: 'Dec 2023', wheat: 2300, rice: 4300, vegetables: 3900, fruits: 4300 },
  ];

  const cropDistribution = [
    { name: 'Wheat', value: 35 },
    { name: 'Rice', value: 30 },
    { name: 'Vegetables', value: 20 },
    { name: 'Fruits', value: 15 },
  ];

  const stakeholderDistribution = [
    { name: 'Farmers', value: 45 },
    { name: 'Distributors', value: 25 },
    { name: 'Retailers', value: 20 },
    { name: 'Consumers', value: 10 },
  ];

  const regionDistribution = [
    { name: 'North', value: 30 },
    { name: 'South', value: 25 },
    { name: 'East', value: 20 },
    { name: 'West', value: 25 },
  ];

  const fraudAlerts = [
    { id: 1, type: 'QR Code Tampering', location: 'Delhi', status: 'Investigating', date: '2023-12-01', severity: 'High' },
    { id: 2, type: 'False Origin Claims', location: 'Mumbai', status: 'Resolved', date: '2023-11-28', severity: 'Medium' },
    { id: 3, type: 'Duplicate Blockchain Entry', location: 'Bangalore', status: 'Confirmed', date: '2023-11-25', severity: 'High' },
    { id: 4, type: 'Price Manipulation', location: 'Chennai', status: 'Resolved', date: '2023-11-20', severity: 'Low' },
    { id: 5, type: 'Quantity Mismatch', location: 'Kolkata', status: 'Investigating', date: '2023-11-15', severity: 'Medium' },
  ];

  const impactMetrics = [
    { metric: 'Farmers with 30%+ Income Increase', value: 68, change: '+12%', trend: 'up' },
    { metric: 'Average Supply Chain Transparency', value: 92, change: '+15%', trend: 'up' },
    { metric: 'Reduction in Food Wastage', value: 23, change: '-23%', trend: 'up' },
    { metric: 'Consumer Trust Score', value: 87, change: '+9%', trend: 'up' },
    { metric: 'Fair Price Compliance', value: 94, change: '+7%', trend: 'up' },
  ];

  const cropRecommendations = [
    { crop: 'Organic Wheat', region: 'Punjab, Haryana', demand: 'High', price: '₹2,500/quintal', roi: '+25%' },
    { crop: 'Basmati Rice', region: 'Uttar Pradesh, Punjab', demand: 'Very High', price: '₹3,800/quintal', roi: '+32%' },
    { crop: 'Tomatoes', region: 'Maharashtra, Karnataka', demand: 'Medium', price: '₹1,800/quintal', roi: '+18%' },
    { crop: 'Apples', region: 'Himachal Pradesh, Kashmir', demand: 'High', price: '₹4,500/quintal', roi: '+28%' },
    { crop: 'Organic Pulses', region: 'Madhya Pradesh, Rajasthan', demand: 'High', price: '₹7,200/quintal', roi: '+30%' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Admin Analytics Dashboard</h1>
            <p className="text-gray-600">Welcome back, {profile?.first_name} {profile?.last_name}</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="flex items-center">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12,486</div>
              <p className="text-xs text-muted-foreground">+18% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blockchain Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87,342</div>
              <p className="text-xs text-muted-foreground">+32% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fraud Alerts</CardTitle>
              <ShieldAlert className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">-7% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Farmer Income</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹18,245</div>
              <p className="text-xs text-muted-foreground">+24% from last month</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="market" className="mb-8">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="market">
              <BarChartIcon className="h-4 w-4 mr-2" />
              Market Trends
            </TabsTrigger>
            <TabsTrigger value="impact">
              <LineChartIcon className="h-4 w-4 mr-2" />
              Impact Metrics
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              <Leaf className="h-4 w-4 mr-2" />
              Crop Recommendations
            </TabsTrigger>
            <TabsTrigger value="fraud">
              <ShieldAlert className="h-4 w-4 mr-2" />
              Fraud Detection
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="market" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center">
                  <div>
                    <CardTitle>Market Price Trends</CardTitle>
                    <CardDescription>Average price per quintal over time</CardDescription>
                  </div>
                  <div className="flex space-x-2 mt-2 md:mt-0">
                    <Select value={cropFilter} onValueChange={setCropFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by crop" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Crops</SelectItem>
                        <SelectItem value="wheat">Wheat</SelectItem>
                        <SelectItem value="rice">Rice</SelectItem>
                        <SelectItem value="vegetables">Vegetables</SelectItem>
                        <SelectItem value="fruits">Fruits</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={marketTrends}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value) => `₹${value}`} />
                      <Tooltip formatter={(value) => [`₹${value}`, '']}/>
                      <Legend />
                      <Line type="monotone" dataKey="wheat" stroke="#F59E0B" strokeWidth={2} />
                      <Line type="monotone" dataKey="rice" stroke="#10B981" strokeWidth={2} />
                      <Line type="monotone" dataKey="vegetables" stroke="#EF4444" strokeWidth={2} />
                      <Line type="monotone" dataKey="fruits" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between text-xs text-muted-foreground">
                <div>Source: KrishiSetu Market Data</div>
                <div>Updated: Daily</div>
              </CardFooter>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Crop Distribution</CardTitle>
                  <CardDescription>By volume traded</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={cropDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="name"
                          label={({name, value}) => `${name}: ${value}%`}
                        >
                          {cropDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#F59E0B', '#10B981', '#EF4444', '#3B82F6'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`, '']}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Stakeholder Distribution</CardTitle>
                  <CardDescription>Platform users by role</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stakeholderDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          nameKey="name"
                          label={({name, value}) => `${name}: ${value}%`}
                        >
                          {stakeholderDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#A855F7'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`, '']}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Regional Distribution</CardTitle>
                  <CardDescription>Production by region</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={regionDistribution}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `${value}%`} />
                        <Tooltip formatter={(value) => [`${value}%`, '']}/>
                        <Bar dataKey="value" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="impact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Social Impact Metrics</CardTitle>
                <CardDescription>Key performance indicators for social impact</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {impactMetrics.map((metric) => (
                    <div key={metric.metric} className="space-y-2">
                      <div className="flex justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{metric.metric}</p>
                          <p className="text-sm text-muted-foreground">
                            {metric.change} from previous period
                          </p>
                        </div>
                        <div className="text-2xl font-bold">{metric.value}%</div>
                      </div>
                      <Progress 
                        value={metric.value} 
                        className={cn(
                          "h-2",
                          metric.trend === 'up' ? "bg-green-100" : "bg-red-100"
                        )} 
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Farmer Income Growth</CardTitle>
                  <CardDescription>Average monthly income in ₹</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          { month: 'Jan', income: 12000, baseline: 10000 },
                          { month: 'Feb', income: 13000, baseline: 10200 },
                          { month: 'Mar', income: 14500, baseline: 10400 },
                          { month: 'Apr', income: 15200, baseline: 10600 },
                          { month: 'May', income: 16000, baseline: 10800 },
                          { month: 'Jun', income: 16800, baseline: 11000 },
                          { month: 'Jul', income: 17500, baseline: 11200 },
                          { month: 'Aug', income: 18000, baseline: 11400 },
                          { month: 'Sep', income: 18500, baseline: 11600 },
                          { month: 'Oct', income: 19000, baseline: 11800 },
                          { month: 'Nov', income: 19500, baseline: 12000 },
                          { month: 'Dec', income: 20000, baseline: 12200 },
                        ]}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `₹${value}`} />
                        <Tooltip formatter={(value) => [`₹${value}`, '']}/>
                        <Legend />
                        <Area type="monotone" dataKey="income" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                        <Area type="monotone" dataKey="baseline" stroke="#9CA3AF" fill="#9CA3AF" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  Blue: With KrishiSetu, Gray: Traditional Market
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Supply Chain Efficiency</CardTitle>
                  <CardDescription>Time from farm to consumer (days)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { product: 'Wheat', traditional: 12, krishisetu: 4 },
                          { product: 'Rice', traditional: 14, krishisetu: 5 },
                          { product: 'Vegetables', traditional: 8, krishisetu: 2 },
                          { product: 'Fruits', traditional: 10, krishisetu: 3 },
                          { product: 'Pulses', traditional: 15, krishisetu: 6 },
                        ]}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="product" />
                        <YAxis tickFormatter={(value) => `${value} days`} />
                        <Tooltip formatter={(value) => [`${value} days`, '']}/>
                        <Legend />
                        <Bar dataKey="traditional" fill="#9CA3AF" />
                        <Bar dataKey="krishisetu" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  Blue: With KrishiSetu, Gray: Traditional Market
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="recommendations" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center">
                  <div>
                    <CardTitle>AI-Powered Crop Recommendations</CardTitle>
                    <CardDescription>Based on market demand, climate, and soil conditions</CardDescription>
                  </div>
                  <div className="flex space-x-2 mt-2 md:mt-0">
                    <Select value={regionFilter} onValueChange={setRegionFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        <SelectItem value="north">North</SelectItem>
                        <SelectItem value="south">South</SelectItem>
                        <SelectItem value="east">East</SelectItem>
                        <SelectItem value="west">West</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recommended Crop</TableHead>
                      <TableHead>Suitable Regions</TableHead>
                      <TableHead>Market Demand</TableHead>
                      <TableHead>Expected Price</TableHead>
                      <TableHead>Projected ROI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cropRecommendations.map((rec) => (
                      <TableRow key={rec.crop}>
                        <TableCell className="font-medium">{rec.crop}</TableCell>
                        <TableCell>{rec.region}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            rec.demand === 'Very High' ? 'bg-green-500' :
                            rec.demand === 'High' ? 'bg-green-400' :
                            rec.demand === 'Medium' ? 'bg-yellow-500' :
                            'bg-red-500'
                          )}>
                            {rec.demand}
                          </Badge>
                        </TableCell>
                        <TableCell>{rec.price}</TableCell>
                        <TableCell className="text-green-600 font-medium">{rec.roi}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">Recommendations updated weekly based on market data and climate forecasts</p>
              </CardFooter>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Seasonal Planting Calendar</CardTitle>
                  <CardDescription>Optimal planting times by crop</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Wheat</h3>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '33%' }}></div>
                        </div>
                        <span className="ml-2 text-xs">Oct-Nov</span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Rice (Kharif)</h3>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '25%', marginLeft: '50%' }}></div>
                        </div>
                        <span className="ml-2 text-xs">Jun-Jul</span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Tomatoes</h3>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-red-500 h-2.5 rounded-full" style={{ width: '16%', marginLeft: '16%' }}></div>
                        </div>
                        <span className="ml-2 text-xs">Feb-Mar</span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Pulses</h3>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: '25%', marginLeft: '25%' }}></div>
                        </div>
                        <span className="ml-2 text-xs">Apr-May</span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Apples</h3>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '16%', marginLeft: '0%' }}></div>
                        </div>
                        <span className="ml-2 text-xs">Jan-Feb</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                    <span>Jan</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span>Dec</span>
                  </div>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Climate Risk Assessment</CardTitle>
                  <CardDescription>Potential risks by region</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 border-red-500 text-red-500">High Risk</Badge>
                        <span className="font-medium">Drought</span>
                      </div>
                      <span>Western Maharashtra, Rajasthan</span>
                    </div>
                    
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 border-amber-500 text-amber-500">Medium Risk</Badge>
                        <span className="font-medium">Flooding</span>
                      </div>
                      <span>Bihar, Eastern UP, Assam</span>
                    </div>
                    
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 border-amber-500 text-amber-500">Medium Risk</Badge>
                        <span className="font-medium">Pest Infestation</span>
                      </div>
                      <span>Punjab, Haryana</span>
                    </div>
                    
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 border-green-500 text-green-500">Low Risk</Badge>
                        <span className="font-medium">Frost</span>
                      </div>
                      <span>Southern States</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 border-red-500 text-red-500">High Risk</Badge>
                        <span className="font-medium">Heatwave</span>
                      </div>
                      <span>Central India</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full">
                    View Detailed Climate Report
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="fraud" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center">
                  <div>
                    <CardTitle>Fraud Detection & Alerts</CardTitle>
                    <CardDescription>Recent suspicious activities detected by the system</CardDescription>
                  </div>
                  <div className="flex space-x-2 mt-2 md:mt-0">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alert Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fraudAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{alert.type}</TableCell>
                        <TableCell>{alert.location}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            alert.status === 'Investigating' ? 'bg-amber-500' :
                            alert.status === 'Confirmed' ? 'bg-red-500' :
                            'bg-green-500'
                          )}>
                            {alert.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{alert.date}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {alert.severity === 'High' ? (
                              <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                            ) : alert.severity === 'Medium' ? (
                              <AlertTriangle className="h-4 w-4 text-amber-500 mr-1" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-green-500 mr-1" />
                            )}
                            {alert.severity}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-xs text-muted-foreground">Showing 5 of 23 alerts</div>
                <Button variant="outline" size="sm">
                  View All Alerts
                </Button>
              </CardFooter>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Blockchain Verification Status</CardTitle>
                  <CardDescription>System integrity metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">Smart Contract Integrity</p>
                          <p className="text-xs text-muted-foreground">All contracts functioning properly</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500">100%</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">QR Code Authenticity</p>
                          <p className="text-xs text-muted-foreground">Valid QR codes in circulation</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500">99.7%</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium">Transaction Anomalies</p>
                          <p className="text-xs text-muted-foreground">Unusual patterns detected</p>
                        </div>
                      </div>
                      <Badge className="bg-red-500">2.3%</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">Origin Verification</p>
                          <p className="text-xs text-muted-foreground">Produce with verified origins</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500">98.2%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Fraud Prevention Measures</CardTitle>
                  <CardDescription>System security enhancements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Multi-factor Authentication</span>
                        <span className="text-sm font-medium text-green-600">Implemented</span>
                      </div>
                      <Progress value={100} className="h-2 bg-green-100" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Blockchain Verification</span>
                        <span className="text-sm font-medium text-green-600">Implemented</span>
                      </div>
                      <Progress value={100} className="h-2 bg-green-100" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">AI Anomaly Detection</span>
                        <span className="text-sm font-medium text-green-600">Implemented</span>
                      </div>
                      <Progress value={100} className="h-2 bg-green-100" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Secure QR Technology</span>
                        <span className="text-sm font-medium text-green-600">Implemented</span>
                      </div>
                      <Progress value={100} className="h-2 bg-green-100" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Advanced Encryption</span>
                        <span className="text-sm font-medium text-amber-600">In Progress</span>
                      </div>
                      <Progress value={75} className="h-2 bg-amber-100" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full">
                    View Security Roadmap
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;