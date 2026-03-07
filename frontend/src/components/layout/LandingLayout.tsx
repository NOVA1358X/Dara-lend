import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { NoiseOverlay } from '@/components/shared/NoiseOverlay';

interface LandingLayoutProps {
  children: ReactNode;
}

export function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <NoiseOverlay />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
