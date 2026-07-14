import Image from "next/image";
import HeroSection from "./components/landing/HeroSection";
import FeaturesSection from "./components/landing/FeaturesSection";
import IntegrationsSection from "./components/landing/IntegrationsSection";
import HowItWorksSection from "./components/landing/HowItWorksSection";
import StatsSection from "./components/landing/StatsSection";
import MoreFeaturesSection from "./components/landing/MoreFeaturesSection";
import CTASection from "./components/landing/CTASection";
import Footer from "./components/landing/Footer";

export default function Home() {
  return (
    <>
      <HeroSection></HeroSection>
      <FeaturesSection></FeaturesSection>
      <IntegrationsSection></IntegrationsSection>
      <HowItWorksSection></HowItWorksSection>
      <StatsSection></StatsSection>
      <MoreFeaturesSection></MoreFeaturesSection>
      <CTASection></CTASection>
      <Footer></Footer>
    </>
  );
}
