import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { FloatingParticles } from '@/components/shared/FloatingParticles';

export function CTASection() {
  const { ref, inView } = useScrollReveal({ threshold: 0.3 });

  return (
    <section ref={ref} className="relative py-section-mobile md:py-section overflow-hidden">
      <div className="absolute inset-0 bg-bg-primary" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/0 to-black/80" />
      <FloatingParticles count={25} maxSize={1.5} speed={0.15} />

      <div className="relative z-10 max-w-[800px] mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
          animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <span className="font-label text-label uppercase tracking-[0.3em] text-secondary mb-6 block">
            Get Started
          </span>
          <h2 className="font-headline text-cta-headline text-text-primary mb-6">
            Ready to Lend<br />Without Being Seen?
          </h2>
          <p className="text-[17px] text-text-secondary font-light mb-10 max-w-[500px] mx-auto">
            Deposit collateral, borrow stablecoins, earn yield, and transfer freely — all without
            revealing your identity, balances, or strategy to anyone.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/app" className="btn-signature">
              Enter the Vault
            </Link>
            <Link to="/docs" className="btn-outline">
              Read the Docs
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
