import { LandingLayout } from '@/components/layout/LandingLayout';
import { HeroSection } from '@/components/landing/HeroSection';
import { ProblemSolution } from '@/components/landing/ProblemSolution';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { PrivacyArchitecture } from '@/components/landing/PrivacyArchitecture';
import { TechnicalEdge } from '@/components/landing/TechnicalEdge';
import { CrossChainSection } from '@/components/landing/CrossChainSection';
import { SecuritySection } from '@/components/landing/SecuritySection';
import { CTASection } from '@/components/landing/CTASection';

export default function Landing() {
  return (
    <LandingLayout>
      <HeroSection />
      <ProblemSolution />
      <HowItWorks />
      <PrivacyArchitecture />
      <TechnicalEdge />
      <CrossChainSection />
      <SecuritySection />
      <CTASection />
    </LandingLayout>
  );
}
