import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Tractor, 
  Package, 
  Store, 
  User,
  TrendingUp,
  ShieldCheck,
  QrCode,
  MapPin,
  Clock,
  AlertCircle,
  Plus,
  Settings,
  Eye,
  Scan,
  Truck,
  DollarSign,
  CheckCircle,
  XCircle,
  ArrowRight,
  Download,
  Upload,
  Filter,
  Search
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BatchCreation } from "./BatchCreation";

// Define user roles
type UserRole = 'farmer' | 'distributor' | 'retailer' | 'consumer';

interface Batch {
  id: string;
  product: string;
  farm: string;
  status: string;
  location: string;
  timestamp: string;
  quality?: number;
  price?: number;
  qrCode?: string;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('farmer');
  const [activeTab, setActiveTab] = useState('overview');
  const [showBatchCreation, setShowBatchCreation] = useState(false);

  // Mock user data - in real app, this would come from user profile
  const userProfile = {
    name: user?.email || 'User',
    role: selectedRole,
    avatar: user?.user_metadata?.avatar_url || ''
  };

  // Role-specific data and actions
  const roleData = {
    farmer: {
      title: "Farmer Dashboard",
      description: "Manage your produce batches and track them through the supply chain",
      stats: [
        { label: "Active Batches", value: "12", change: "+3 this week" },
        { label: "Total Produce", value: "2,450 kg", change: "+15% from last month" },
        { label: "Quality Score", value: "98.5%", change: "+2.1% improvement" },
        { label: "Revenue", value: "$12,450", change: "+8.3% this month" }
      ],
      actions: [
        { title: "Create New Batch", icon: Plus, description: "Add new product batch", action: () => setShowBatchCreation(true) },
        { title: "Set Quality Metrics", icon: Settings, description: "Update quality parameters", action: () => console.log("Set quality") },
        { title: "Transfer Ownership", icon: ArrowRight, description: "Transfer to distributor", action: () => console.log("Transfer") },
        { title: "Track Products", icon: Eye, description: "Monitor supply chain", action: () => console.log("Track") }
      ]
    },
    distributor: {
      title: "Distributor Dashboard",
      description: "Receive, assess, and distribute products to retailers",
      stats: [
        { label: "Received Batches", value: "45", change: "+12 this week" },
        { label: "In Transit", value: "18", change: "5 pending delivery" },
        { label: "Quality Assessments", value: "89%", change: "+5% completion rate" },
        { label: "Revenue", value: "$28,750", change: "+12.4% this month" }
      ],
      actions: [
        { title: "Receive Batches", icon: Download, description: "Accept from farmers", action: () => console.log("Receive") },
        { title: "Quality Assessment", icon: CheckCircle, description: "Evaluate product quality", action: () => console.log("Assess") },
        { title: "Set Pricing", icon: DollarSign, description: "Update price information", action: () => console.log("Price") },
        { title: "Transfer to Retailer", icon: Truck, description: "Ship to retail partners", action: () => console.log("Transfer") }
      ]
    },
    retailer: {
      title: "Retailer Dashboard",
      description: "Manage inventory and provide products to consumers",
      stats: [
        { label: "Available Products", value: "156", change: "+23 new items" },
        { label: "QR Codes Generated", value: "89", change: "+15 this week" },
        { label: "Customer Satisfaction", value: "96.2%", change: "+1.8% improvement" },
        { label: "Sales", value: "$45,230", change: "+18.7% this month" }
      ],
      actions: [
        { title: "Receive Products", icon: Download, description: "Accept from distributors", action: () => console.log("Receive") },
        { title: "Finalize Batches", icon: CheckCircle, description: "Complete batch information", action: () => console.log("Finalize") },
        { title: "Generate QR Codes", icon: QrCode, description: "Create tracking codes", action: () => console.log("Generate QR") },
        { title: "Handle Disputes", icon: AlertCircle, description: "Resolve customer issues", action: () => console.log("Disputes") }
      ]
    },
    consumer: {
      title: "Consumer Dashboard",
      description: "Verify products and access supply chain information",
      stats: [
        { label: "Products Scanned", value: "34", change: "+8 this week" },
        { label: "Verified Products", value: "32", change: "94% verification rate" },
        { label: "Trust Score", value: "98.7%", change: "+2.3% improvement" },
        { label: "Savings", value: "$156", change: "From verified purchases" }
      ],
      actions: [
        { title: "Scan QR Code", icon: Scan, description: "Verify product authenticity", action: () => console.log("Scan") },
        { title: "View History", icon: Eye, description: "Check product journey", action: () => console.log("History") },
        { title: "Verify Authenticity", icon: ShieldCheck, description: "Confirm product origin", action: () => console.log("Verify") },
        { title: "Access Data", icon: Search, description: "View quality and pricing", action: () => console.log("Data") }
      ]
    }
  };

  const recentBatches: Batch[] = [
    {
      id: "BATCH001",
      product: "Organic Tomatoes",
      farm: "Green Valley Farm",
      status: "In Transit",
      location: "Processing Center → Retail",
      timestamp: "2 hours ago",
      quality: 95,
      price: 2.50
    },
    {
      id: "BATCH002",
      product: "Fresh Lettuce",
      farm: "Sunrise Organic",
      status: "Delivered",
      location: "Fresh Market Store",
      timestamp: "4 hours ago",
      quality: 98,
      price: 1.75
    },
    {
      id: "BATCH003",
      product: "Heritage Wheat",
      farm: "Prairie Fields",
      status: "Harvested",
      location: "Farm Storage",
      timestamp: "6 hours ago",
      quality: 92,
      price: 3.20
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered": return "bg-trust-green";
      case "In Transit": return "bg-blockchain-blue";
      case "Harvested": return "bg-harvest-amber";
      case "Processing": return "bg-farm-primary";
      default: return "bg-muted";
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'farmer': return <Tractor className="h-6 w-6" />;
      case 'distributor': return <Package className="h-6 w-6" />;
      case 'retailer': return <Store className="h-6 w-6" />;
      case 'consumer': return <User className="h-6 w-6" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'farmer': return 'bg-farm-primary';
      case 'distributor': return 'bg-blockchain-blue';
      case 'retailer': return 'bg-trust-green';
      case 'consumer': return 'bg-harvest-amber';
    }
  };

  return (
    <section id="dashboard" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header with Role Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {userProfile.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className={`${getRoleColor(selectedRole)} text-white`}>
                {getRoleIcon(selectedRole)}
                <span className="ml-2 capitalize">{selectedRole}</span>
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Profile
              </Button>
            </div>
          </div>

          {/* Role Selector */}
          <div className="flex space-x-2 mb-6">
            {(['farmer', 'distributor', 'retailer', 'consumer'] as UserRole[]).map((role) => (
              <Button
                key={role}
                variant={selectedRole === role ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRole(role)}
                className="capitalize"
              >
                {getRoleIcon(role)}
                <span className="ml-2">{role}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Role-specific Dashboard */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {roleData[selectedRole].title}
            </h2>
            <p className="text-muted-foreground">
              {roleData[selectedRole].description}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {roleData[selectedRole].stats.map((stat, index) => (
              <Card key={index} className="border-border hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`${getRoleColor(selectedRole)} text-white p-2 rounded-lg`}>
                      {getRoleIcon(selectedRole)}
                    </div>
                    <TrendingUp className="h-4 w-4 text-trust-green" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-foreground mb-1">
                    {stat.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stat.change}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card className="border-border mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blockchain-blue" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Common tasks for {selectedRole}s
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {roleData[selectedRole].actions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={action.action}
                  >
                    <action.icon className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">{action.title}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Recent Activity */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blockchain-blue" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>
                  Latest updates from your blockchain network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentBatches.map((batch, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <QrCode className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm text-muted-foreground">
                            {batch.id}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{batch.product}</div>
                          <div className="text-sm text-muted-foreground">{batch.farm}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <Badge className={`${getStatusColor(batch.status)} text-white`}>
                            {batch.status}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {batch.timestamp}
                          </div>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1" />
                          {batch.location}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Button variant="outline">View All Activity</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batches" className="space-y-8">
            {/* Batch Management */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-trust-green" />
                      <span>Batch Management</span>
                    </CardTitle>
                    <CardDescription>
                      Manage your product batches and track their progress
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Batch
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentBatches.map((batch, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="font-medium text-foreground">{batch.product}</div>
                          <div className="text-sm text-muted-foreground">ID: {batch.id}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {batch.quality && (
                          <div className="text-center">
                            <div className="text-sm font-medium">Quality</div>
                            <div className="text-lg font-bold text-trust-green">{batch.quality}%</div>
                          </div>
                        )}
                        {batch.price && (
                          <div className="text-center">
                            <div className="text-sm font-medium">Price</div>
                            <div className="text-lg font-bold text-blockchain-blue">${batch.price}</div>
                          </div>
                        )}
                        <Badge className={`${getStatusColor(batch.status)} text-white`}>
                          {batch.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-8">
            {/* Analytics Dashboard */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-farm-primary" />
                  <span>Analytics & Insights</span>
                </CardTitle>
                <CardDescription>
                  Performance metrics and supply chain insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Performance Metrics</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Efficiency Rate</span>
                        <span className="font-bold text-trust-green">94.2%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quality Score</span>
                        <span className="font-bold text-blockchain-blue">96.8%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Time</span>
                        <span className="font-bold text-harvest-amber">2.3 days</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Recent Trends</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Product Volume</span>
                        <span className="font-bold text-trust-green">↗ +12%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Customer Satisfaction</span>
                        <span className="font-bold text-blockchain-blue">↗ +5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Revenue Growth</span>
                        <span className="font-bold text-harvest-amber">↗ +18%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Batch Creation Modal */}
      {showBatchCreation && (
        <BatchCreation onClose={() => setShowBatchCreation(false)} />
      )}
    </section>
  );
};