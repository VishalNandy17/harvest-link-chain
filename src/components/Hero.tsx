import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShieldCheck, Eye, Users, Play, Star, TrendingUp, Globe } from "lucide-react";
import farmHero from "@/assets/farm-hero.jpg";
import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Enhanced Background with Multiple Layers */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background" />
        <img 
          src={farmHero} 
          alt="Modern sustainable farm with technology integration" 
          className="w-full h-full object-cover opacity-8"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 z-5">
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-farm-primary rounded-full animate-pulse opacity-60" />
        <div className="absolute top-1/3 right-1/6 w-1 h-1 bg-blockchain-blue rounded-full animate-pulse opacity-40 animation-delay-1000" />
        <div className="absolute bottom-1/3 right-1/3 w-1.5 h-1.5 bg-trust-green rounded-full animate-pulse opacity-50 animation-delay-2000" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="max-w-2xl">
            {/* Enhanced Badge */}
            <div className="flex items-center space-x-3 mb-8">
              <Badge className="bg-gradient-to-r from-farm-primary/20 to-blockchain-blue/20 text-farm-primary border-farm-primary/30 px-4 py-2">
                <div className="w-2 h-2 bg-trust-green rounded-full mr-2 animate-pulse" />
                BLOCKCHAIN TRANSPARENCY
              </Badge>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 text-harvest-amber fill-current" />
                <span className="font-medium">4.9/5 trusted by farmers</span>
              </div>
            </div>

            {/* Enhanced Heading */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-foreground mb-8 leading-none">
              <span className="block">Track Your</span>
              <span className="block bg-gradient-to-r from-farm-primary via-blockchain-blue to-trust-green bg-clip-text text-transparent animate-gradient">
                Food Journey
              </span>
              <span className="block text-4xl md:text-5xl lg:text-6xl text-muted-foreground font-light">
                From Farm to Fork
              </span>
            </h1>

            {/* Enhanced Description */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 leading-relaxed font-light">
              Revolutionary blockchain technology ensuring complete transparency in agricultural supply chains. 
              <span className="text-foreground font-medium"> Verify origin, quality, and fair pricing</span> while supporting sustainable farming practices.
            </p>

            {/* Enhanced Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="flex items-center space-x-3 p-4 rounded-2xl bg-gradient-to-r from-trust-green/10 to-transparent border border-trust-green/20">
                <div className="p-2 bg-trust-green/20 rounded-xl">
                  <ShieldCheck className="h-5 w-5 text-trust-green" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Verified Origins</div>
                  <div className="text-sm text-muted-foreground">100% authentic</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-2xl bg-gradient-to-r from-blockchain-blue/10 to-transparent border border-blockchain-blue/20">
                <div className="p-2 bg-blockchain-blue/20 rounded-xl">
                  <Eye className="h-5 w-5 text-blockchain-blue" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Full Transparency</div>
                  <div className="text-sm text-muted-foreground">Every step tracked</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-2xl bg-gradient-to-r from-harvest-amber/10 to-transparent border border-harvest-amber/20">
                <div className="p-2 bg-harvest-amber/20 rounded-xl">
                  <Users className="h-5 w-5 text-harvest-amber" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Fair Trade</div>
                  <div className="text-sm text-muted-foreground">Ethical pricing</div>
                </div>
              </div>
            </div>

            {/* Enhanced CTA Section */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link to="/signup">
                <Button variant="hero" size="lg" className="group text-lg px-8 py-4 h-auto shadow-2xl">
                  Start Tracking
                  <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="group text-lg px-8 py-4 h-auto border-2">
                <Play className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>

            {/* Enhanced Trust Indicators */}
            <div className="pt-8 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-6 font-medium">Trusted by agricultural stakeholders worldwide</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-1">500+</div>
                  <div className="text-sm text-muted-foreground">Active Farms</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-1">50K+</div>
                  <div className="text-sm text-muted-foreground">Products Tracked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-1">99.9%</div>
                  <div className="text-sm text-muted-foreground">Verification Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-1">24/7</div>
                  <div className="text-sm text-muted-foreground">Monitoring</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Visual Elements */}
          <div className="relative lg:block hidden">
            <div className="relative">
              {/* Main Image Container */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-700">
                <img 
                  src={farmHero} 
                  alt="Advanced agricultural technology and blockchain integration"
                  className="w-full h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 text-white">
                  <div className="text-lg font-semibold mb-1">Live Tracking Active</div>
                  <div className="text-sm opacity-90">1,247 products monitored</div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-border/50">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-trust-green" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">Quality Score</div>
                    <div className="text-xs text-muted-foreground">98.5% Average</div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-border/50">
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-blockchain-blue" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">Global Network</div>
                    <div className="text-xs text-muted-foreground">45 Countries</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};