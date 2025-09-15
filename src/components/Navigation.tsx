import { Button } from "@/components/ui/button";
import { Leaf, ShieldCheck, Truck, QrCode, Menu, X, ChevronDown, User, LogOut } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-white/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50 transition-all duration-300">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Enhanced Logo */}
          <div className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-farm-primary to-farm-secondary rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-all duration-300" />
              <div className="relative bg-gradient-to-r from-farm-primary to-farm-secondary p-2.5 rounded-xl">
                <Leaf className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-farm-primary to-blockchain-blue bg-clip-text text-transparent">
                HarvestLink
              </span>
              <div className="text-xs text-muted-foreground tracking-wide">BLOCKCHAIN TRANSPARENCY</div>
            </div>
          </div>

          {/* Enhanced Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-muted/50 rounded-full p-1">
              <a href="#dashboard" className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-white hover:text-farm-primary transition-all duration-200 hover:shadow-sm">
                Dashboard
              </a>
              <a href="#track" className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-white hover:text-farm-primary transition-all duration-200 hover:shadow-sm">
                Track Produce
              </a>
              <a href="#verify" className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-white hover:text-farm-primary transition-all duration-200 hover:shadow-sm">
                Verify Origin
              </a>
              <a href="#stakeholders" className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-white hover:text-farm-primary transition-all duration-200 hover:shadow-sm">
                Stakeholders
              </a>
            </div>
          </div>

          {/* Enhanced Desktop CTA */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{user.email}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        signOut().catch(error => {
                          console.error('Error during sign out:', error);
                        });
                      }}
                      className="w-full text-left flex items-center text-red-600 px-2 py-1.5 text-sm"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-foreground hover:text-farm-primary">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="hero" size="sm" className="shadow-lg">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Enhanced Mobile menu button */}
          <button
            className="md:hidden relative p-2 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-200"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Enhanced Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-border/50 bg-white/95 backdrop-blur-sm">
            <div className="flex flex-col space-y-1">
              <a href="#dashboard" className="px-4 py-3 rounded-xl text-foreground hover:bg-muted/50 hover:text-farm-primary transition-all duration-200 font-medium">
                Dashboard
              </a>
              <a href="#track" className="px-4 py-3 rounded-xl text-foreground hover:bg-muted/50 hover:text-farm-primary transition-all duration-200 font-medium">
                Track Produce
              </a>
              <a href="#verify" className="px-4 py-3 rounded-xl text-foreground hover:bg-muted/50 hover:text-farm-primary transition-all duration-200 font-medium">
                Verify Origin
              </a>
              <a href="#stakeholders" className="px-4 py-3 rounded-xl text-foreground hover:bg-muted/50 hover:text-farm-primary transition-all duration-200 font-medium">
                Stakeholders
              </a>
              <div className="flex flex-col space-y-3 pt-6">
                {user ? (
                  <>
                    <div className="mx-4 px-4 py-2 text-sm text-muted-foreground border-b border-border/50">
                      Signed in as {user.email}
                    </div>
                    <Link to="/dashboard" className="mx-4">
                      <Button variant="outline" size="sm" className="w-full">
                        Dashboard
                      </Button>
                    </Link>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        signOut().catch(error => {
                          console.error('Error during sign out:', error);
                        });
                      }} 
                      className="mx-4 w-full"
                    >
                      <Button variant="outline" size="sm" className="w-full text-red-600 hover:text-red-700">
                        Sign Out
                      </Button>
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="mx-4">
                      <Button variant="outline" size="sm" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/signup" className="mx-4">
                      <Button variant="hero" size="sm" className="w-full">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};