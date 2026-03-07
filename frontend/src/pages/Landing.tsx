import { LandingLayout } from '@/components/layout/LandingLayout';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatsBar } from '@/components/landing/StatsBar';
import { ProblemSolution } from '@/components/landing/ProblemSolution';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { PrivacyArchitecture } from '@/components/landing/PrivacyArchitecture';
import { CrossChainSection } from '@/components/landing/CrossChainSection';
import { SecuritySection } from '@/components/landing/SecuritySection';
import { CTASection } from '@/components/landing/CTASection';

export default function Landing() {
  return (
    <LandingLayout>
      <HeroSection />
      <StatsBar />
      <ProblemSolution />
      <HowItWorks />
      <PrivacyArchitecture />
      <CrossChainSection />
      <SecuritySection />
      <CTASection />
    </LandingLayout>
  );
}
