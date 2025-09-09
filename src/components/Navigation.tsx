import { Button } from "@/components/ui/button";
import { Leaf, ShieldCheck, Truck, QrCode, Menu, X } from "lucide-react";
import { useState } from "react";

export const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Leaf className="h-8 w-8 text-farm-primary" />
            <span className="text-xl font-bold text-foreground">HarvestLink</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#dashboard" className="text-foreground hover:text-farm-primary transition-colors">
              Dashboard
            </a>
            <a href="#track" className="text-foreground hover:text-farm-primary transition-colors">
              Track Produce
            </a>
            <a href="#verify" className="text-foreground hover:text-farm-primary transition-colors">
              Verify Origin
            </a>
            <a href="#stakeholders" className="text-foreground hover:text-farm-primary transition-colors">
              Stakeholders
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
            <Button variant="hero" size="sm">
              Get Started
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              <a href="#dashboard" className="text-foreground hover:text-farm-primary transition-colors">
                Dashboard
              </a>
              <a href="#track" className="text-foreground hover:text-farm-primary transition-colors">
                Track Produce
              </a>
              <a href="#verify" className="text-foreground hover:text-farm-primary transition-colors">
                Verify Origin
              </a>
              <a href="#stakeholders" className="text-foreground hover:text-farm-primary transition-colors">
                Stakeholders
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
                <Button variant="hero" size="sm">
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};