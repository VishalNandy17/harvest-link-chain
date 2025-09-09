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
  AlertCircle
} from "lucide-react";
import blockchainNetwork from "@/assets/blockchain-network.jpg";

export const Dashboard = () => {
  const stakeholders = [
    {
      type: "Farmer",
      icon: <Tractor className="h-6 w-6" />,
      count: "1,247",
      description: "Registered farmers tracking their produce",
      color: "bg-farm-primary"
    },
    {
      type: "Distributor",
      icon: <Package className="h-6 w-6" />,
      description: "Distribution partners in the network",
      count: "89",
      color: "bg-blockchain-blue"
    },
    {
      type: "Retailer",
      icon: <Store className="h-6 w-6" />,
      count: "312",
      description: "Retail outlets providing verified produce",
      color: "bg-trust-green"
    },
    {
      type: "Consumer",
      icon: <User className="h-6 w-6" />,
      count: "45K+",
      description: "Active consumers verifying their food",
      color: "bg-harvest-amber"
    }
  ];

  const recentTransactions = [
    {
      id: "TXN001",
      product: "Organic Tomatoes",
      farm: "Green Valley Farm",
      status: "In Transit",
      location: "Processing Center → Retail",
      timestamp: "2 hours ago"
    },
    {
      id: "TXN002", 
      product: "Fresh Lettuce",
      farm: "Sunrise Organic",
      status: "Delivered",
      location: "Fresh Market Store",
      timestamp: "4 hours ago"
    },
    {
      id: "TXN003",
      product: "Heritage Wheat",
      farm: "Prairie Fields",
      status: "Harvested",
      location: "Farm Storage",
      timestamp: "6 hours ago"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered": return "bg-trust-green";
      case "In Transit": return "bg-blockchain-blue";
      case "Harvested": return "bg-harvest-amber";
      default: return "bg-muted";
    }
  };

  return (
    <section id="dashboard" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="h-2 w-8 bg-gradient-to-r from-farm-primary to-blockchain-blue rounded-full" />
            <span className="text-farm-primary font-semibold tracking-wide">DASHBOARD</span>
            <div className="h-2 w-8 bg-gradient-to-r from-blockchain-blue to-farm-primary rounded-full" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Real-time Supply Chain
            <br />
            <span className="bg-gradient-to-r from-farm-primary to-blockchain-blue bg-clip-text text-transparent">
              Monitoring Dashboard
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Complete visibility into your agricultural supply chain with live tracking, 
            verification status, and stakeholder management.
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Stakeholder Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stakeholders.map((stakeholder, index) => (
                <Card key={index} className="border-border hover:shadow-md transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`${stakeholder.color} text-white p-2 rounded-lg`}>
                        {stakeholder.icon}
                      </div>
                      <TrendingUp className="h-4 w-4 text-trust-green" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground mb-1">
                      {stakeholder.count}
                    </div>
                    <div className="text-sm font-medium text-foreground mb-1">
                      {stakeholder.type}s
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stakeholder.description}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Transactions */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blockchain-blue" />
                  <span>Recent Transactions</span>
                </CardTitle>
                <CardDescription>
                  Latest supply chain activities and product movements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.map((transaction, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <QrCode className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm text-muted-foreground">
                            {transaction.id}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{transaction.product}</div>
                          <div className="text-sm text-muted-foreground">{transaction.farm}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <Badge className={`${getStatusColor(transaction.status)} text-white`}>
                            {transaction.status}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {transaction.timestamp}
                          </div>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1" />
                          {transaction.location}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Button variant="outline">View All Transactions</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-8">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-trust-green" />
                  <span>Product Tracking</span>
                </CardTitle>
                <CardDescription>
                  Track specific products through the supply chain
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Scan QR Code to Track
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Use your device camera to scan any product QR code for instant tracking
                  </p>
                  <Button variant="blockchain">Start Scanning</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="space-y-8">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShieldCheck className="h-5 w-5 text-farm-primary" />
                  <span>Blockchain Network</span>
                </CardTitle>
                <CardDescription>
                  Visualization of the agricultural supply chain network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <img 
                    src={blockchainNetwork} 
                    alt="Blockchain network visualization showing agricultural supply chain connections"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-lg" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <div className="text-lg font-semibold">Network Status: Active</div>
                    <div className="text-sm opacity-80">1,648 verified connections</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-farm-primary">99.9%</div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blockchain-blue">2.3s</div>
                    <div className="text-sm text-muted-foreground">Avg Response</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-trust-green">1,648</div>
                    <div className="text-sm text-muted-foreground">Active Nodes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-harvest-amber">50K+</div>
                    <div className="text-sm text-muted-foreground">Transactions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};