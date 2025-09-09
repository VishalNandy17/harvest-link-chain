import { Leaf, Github, Twitter, Linkedin, Mail, MapPin, Phone } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-farm-primary to-farm-secondary text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">HarvestLink</h3>
                <p className="text-sm text-white/80">Blockchain Agriculture</p>
              </div>
            </div>
            <p className="text-white/90 leading-relaxed">
              Connecting farms to consumers through transparent, blockchain-verified supply chains. 
              Ensuring fair pricing and authentic produce tracking.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Platform</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/90 hover:text-white transition-colors">Track Produce</a></li>
              <li><a href="#" className="text-white/90 hover:text-white transition-colors">Farmer Dashboard</a></li>
              <li><a href="#" className="text-white/90 hover:text-white transition-colors">Retailer Portal</a></li>
              <li><a href="#" className="text-white/90 hover:text-white transition-colors">Consumer App</a></li>
              <li><a href="#" className="text-white/90 hover:text-white transition-colors">Supply Chain Analytics</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/90 hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="text-white/90 hover:text-white transition-colors">API Documentation</a></li>
              <li><a href="#" className="text-white/90 hover:text-white transition-colors">Community Forum</a></li>
              <li><a href="#" className="text-white/90 hover:text-white transition-colors">Contact Support</a></li>
              <li><a href="#" className="text-white/90 hover:text-white transition-colors">System Status</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Contact</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-white/80" />
                <span className="text-white/90">hello@harvestlink.io</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-white/80" />
                <span className="text-white/90">+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-white/80" />
                <span className="text-white/90">San Francisco, CA</span>
              </div>
            </div>
            <div className="pt-4">
              <h5 className="font-medium mb-2">Subscribe to Updates</h5>
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-l-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <button className="px-4 py-2 bg-white text-farm-primary rounded-r-lg hover:bg-white/90 transition-colors font-medium">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-white/80 text-sm">
            © 2024 HarvestLink. All rights reserved. Built with blockchain technology for agricultural transparency.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-white/80 hover:text-white text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-white/80 hover:text-white text-sm transition-colors">Terms of Service</a>
            <a href="#" className="text-white/80 hover:text-white text-sm transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};