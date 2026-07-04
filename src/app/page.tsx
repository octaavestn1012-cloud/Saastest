import { PublicHeader } from "@/components/features/landing/PublicHeader";
import { HeroSection } from "@/components/features/landing/HeroSection";
import { BentoGridSection } from "@/components/features/landing/BentoGridSection";
import { TrustSection } from "@/components/features/landing/TrustSection";
import { PricingSection } from "@/components/features/landing/PricingSection";
import { FAQSection } from "@/components/features/landing/FAQSection";
import { CTASection } from "@/components/features/landing/CTASection";
import { PublicFooter } from "@/components/features/landing/PublicFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans selection:bg-primary/20 selection:text-primary">
      <PublicHeader />
      
      <main>
        <HeroSection />
        <BentoGridSection />
        <TrustSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>

      <PublicFooter />
    </div>
  );
}
