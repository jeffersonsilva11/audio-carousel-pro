import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import ToneShowcase from "@/components/landing/ToneShowcase";
import Testimonials from "@/components/landing/Testimonials";
import TrustedBy from "@/components/landing/TrustedBy";
import Pricing from "@/components/landing/Pricing";
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
          <Hero />
          <TrustedBy />
          <HowItWorks />
          <ToneShowcase />
          <Testimonials />
          <Pricing />
          <FAQ />
          <CTA />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
