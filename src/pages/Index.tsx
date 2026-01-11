import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import ProblemSection from "@/components/landing/ProblemSection";
import StatsSection from "@/components/landing/StatsSection";
import InteractiveDemo from "@/components/landing/InteractiveDemo";
import ToneShowcase from "@/components/landing/ToneShowcase";
import Testimonials from "@/components/landing/Testimonials";
import TrustedBy from "@/components/landing/TrustedBy";
import PriceAnchor from "@/components/landing/PriceAnchor";
import ScarcityBanner from "@/components/landing/ScarcityBanner";
import Pricing from "@/components/landing/Pricing";
import OriginStory from "@/components/landing/OriginStory";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import DynamicStructuredData from "@/components/landing/DynamicStructuredData";
import SEOHead from "@/components/SEOHead";

const Index = () => {
  return (
    <>
      <SEOHead canonicalPath="" />
      <DynamicStructuredData />
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          {/* 1. Hero - Aversão à Perda + Círculo Dourado */}
          <Hero />

          {/* 2. Stats - Social Proof Numbers */}
          <StatsSection />

          {/* 3. O Problema - Framework "O Quê, E Daí, E Agora" */}
          <ProblemSection />

          {/* 4. Demo Interativa - Design Comportamental */}
          <InteractiveDemo />

          {/* 5. Trusted By - Authority Bias */}
          <TrustedBy />

          {/* 6. Tone Showcase - Product Features */}
          <ToneShowcase />

          {/* 7. Testimonials - Social Proof with Results */}
          <Testimonials />

          {/* 8. Price Anchoring - Gatilho de Ancoragem */}
          <PriceAnchor />

          {/* 9. Scarcity Banner - Value-based Scarcity */}
          <ScarcityBanner />

          {/* 10. Pricing - Plans and Features */}
          <Pricing />

          {/* 11. Origin Story - Framework da História de Origem */}
          <OriginStory />

          {/* 12. FAQ - Quebra de Objeções */}
          <FAQ />

          {/* 13. CTA Final */}
          <CTA />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
