import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const features = [
  {
    icon: 'visibility_off',
    title: 'Private Positions',
    description: 'Collateral, debt, and liquidation prices encrypted inside zero-knowledge proofs. MEV bots can\'t target what they can\'t see.',
  },
  {
    icon: 'enhanced_encryption',
    title: 'Encrypted Collateral',
    description: 'Three collateral types — ALEO, USDCx, and USAD — all deposited through fully private transfer paths.',
  },
  {
    icon: 'shield',
    title: 'Zero-Knowledge Debt',
    description: 'Borrow against any collateral with interest rate model and automated sentinel monitoring. No public traces.',
  },
];

export function ProblemSolution() {
  const { ref, inView } = useScrollReveal({ threshold: 0.2 });

  return (
    <section id="architecture" ref={ref} className="py-section-mobile md:py-section bg-bg-primary">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center mb-20">
          <span className="font-label text-label uppercase tracking-[0.3em] text-secondary mb-4 block">
            The Architecture
          </span>
          <h2 className="font-headline text-section-mobile md:text-section text-text-primary">
            Invisible Utility
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="glass-panel p-8 hover:border-white/[0.14] transition-all duration-500"
            >
              <span className="material-symbols-outlined text-3xl text-primary mb-6 block">
                {feature.icon}
              </span>
              <h3 className="font-headline text-xl text-text-primary mb-3">
                {feature.title}
              </h3>
              <p className="text-[15px] leading-relaxed text-text-secondary font-light">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
