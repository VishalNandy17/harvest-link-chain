import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Leaf, 
  QrCode, 
  Shield, 
  TrendingUp, 
  Users, 
  MapPin,
  Clock,
  Award,
  BarChart3,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

export const Features = () => {
  const features = [
    {
      icon: <QrCode className="h-8 w-8" />,
      title: "QR Code Tracking",
      description: "Scan any QR code to instantly access complete product journey from farm to your table.",
      color: "text-blockchain-blue"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Blockchain Security",
      description: "Immutable records ensure data integrity and prevent fraud in the supply chain.",
      color: "text-trust-green"
    },
    {
      icon: <MapPin className="h-8 w-8" />,
      title: "Origin Verification",
      description: "Verify exact farm location, growing conditions, and harvesting details.",
      color: "text-farm-primary"
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Fair Pricing",
      description: "Transparent pricing mechanisms ensure farmers receive fair compensation.",
      color: "text-harvest-amber"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Multi-Stakeholder",
      description: "Connect farmers, distributors, retailers, and consumers in one ecosystem.",
      color: "text-farm-secondary"
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Real-time Updates",
      description: "Live tracking of produce movement and condition throughout the supply chain.",
      color: "text-blockchain-blue"
    }
  ];

  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="h-2 w-8 bg-gradient-to-r from-farm-primary to-blockchain-blue rounded-full" />
            <span className="text-farm-primary font-semibold tracking-wide">FEATURES</span>
            <div className="h-2 w-8 bg-gradient-to-r from-blockchain-blue to-farm-primary rounded-full" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Powerful Tools for
            <br />
            <span className="bg-gradient-to-r from-farm-primary to-blockchain-blue bg-clip-text text-transparent">
              Agricultural Transparency
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive blockchain-based platform providing end-to-end visibility 
            and trust in agricultural supply chains.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm"
            >
              <CardHeader>
                <div className={`${feature.color} mb-4`}>
                  {feature.icon}
                </div>
                <CardTitle className="text-xl text-foreground">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform Stats */}
        <div className="bg-gradient-to-r from-farm-primary to-blockchain-blue rounded-2xl p-8 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold mb-2">500+</div>
              <div className="text-white/80">Connected Farms</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">50K+</div>
              <div className="text-white/80">Products Tracked</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">99.9%</div>
              <div className="text-white/80">Data Accuracy</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-2">24/7</div>
              <div className="text-white/80">Real-time Monitoring</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            Ready to Experience Transparent Farming?
          </h3>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of farmers and consumers who trust our blockchain platform 
            for complete supply chain transparency and fair trade practices.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button variant="hero" size="lg" className="group text-lg px-8 py-4 h-auto shadow-xl">
                Get Started Today
                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="text-lg px-8 py-4 h-auto border-2">
                Sign In to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};