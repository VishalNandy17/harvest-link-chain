import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Eye, Users } from "lucide-react";
import farmHero from "@/assets/farm-hero.jpg";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-br from-background to-muted">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={farmHero} 
          alt="Modern sustainable farm with technology integration" 
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl">
          <div className="flex items-center space-x-2 mb-6">
            <div className="h-2 w-12 bg-gradient-to-r from-farm-primary to-farm-secondary rounded-full" />
            <span className="text-farm-primary font-semibold tracking-wide">BLOCKCHAIN TRANSPARENCY</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
            Track Your Food
            <br />
            <span className="bg-gradient-to-r from-farm-primary to-blockchain-blue bg-clip-text text-transparent">
              From Farm to Fork
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
            Revolutionary blockchain technology ensuring complete transparency in agricultural supply chains. 
            Verify origin, quality, and fair pricing while supporting sustainable farming practices.
          </p>

          {/* Feature Highlights */}
          <div className="flex flex-wrap gap-6 mb-8">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-trust-green" />
              <span className="text-foreground font-medium">Verified Origins</span>
            </div>
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blockchain-blue" />
              <span className="text-foreground font-medium">Full Transparency</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-harvest-amber" />
              <span className="text-foreground font-medium">Fair Trade</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="hero" size="lg" className="group">
              Start Tracking
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg">
              View Demo
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">Trusted by agricultural stakeholders worldwide</p>
            <div className="flex items-center space-x-8 opacity-60">
              <div className="text-sm font-semibold">500+ Farms</div>
              <div className="text-sm font-semibold">50K+ Products Tracked</div>
              <div className="text-sm font-semibold">99.9% Verification Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};