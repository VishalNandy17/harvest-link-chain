import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Dashboard } from "@/components/Dashboard";
import { QRSection } from "@/components/QRSection";
import { Stakeholders } from "@/components/Stakeholders";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <Features />
      <Dashboard />
      <QRSection />
      <Stakeholders />
      <Footer />
    </div>
  );
};

export default Index;
