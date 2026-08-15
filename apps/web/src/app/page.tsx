import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LifeSpaces } from "@/components/landing/LifeSpaces";
import { ManifestoBridge } from "@/components/landing/ManifestoBridge";
import { PrivacySection } from "@/components/landing/PrivacySection";
import { ProductExperience } from "@/components/landing/ProductExperience";
import { WaitlistSection } from "@/components/landing/WaitlistSection";

export default function Home() {
  return (
    <div className="gradient-hero min-h-full">
      <LandingHeader />
      <main>
        <LandingHero />
        <HowItWorks />
        <ProductExperience />
        <LifeSpaces />
        <PrivacySection />
        <ManifestoBridge />
        <WaitlistSection />
      </main>
      <LandingFooter />
    </div>
  );
}
