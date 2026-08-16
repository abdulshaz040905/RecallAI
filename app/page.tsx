import SiteNav from './components/landing/SiteNav'
import HeroSection from './components/landing/HeroSection'
import FeaturesSection from './components/landing/FeaturesSection'
import HowItWorksSection from './components/landing/HowItWorksSection'
import IntegrationsSection from './components/landing/IntegrationsSection'
import StatsSection from './components/landing/StatsSection'
import MoreFeaturesSection from './components/landing/MoreFeaturesSection'
import PricingSection from './components/landing/PricingSection'
import CTASection from './components/landing/CTASection'
import Footer from './components/landing/Footer'

export default function LandingPage() {
    return (
        <div className="min-h-screen overflow-x-hidden bg-paper">
            <SiteNav />
            <HeroSection />
            <FeaturesSection />
            <HowItWorksSection />
            <IntegrationsSection />
            <StatsSection />
            <MoreFeaturesSection />
            <PricingSection />
            <CTASection />
            <Footer />
        </div>
    )
}
