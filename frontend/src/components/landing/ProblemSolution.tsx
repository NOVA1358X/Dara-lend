import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { SpotlightCard } from '@/components/shared/SpotlightCard';

const features = [
  {
    icon: 'visibility_off',
    title: 'Invisible Positions',
    description: 'Your collateral, loans, and flash-loan receipts are fully encrypted. No one — not even validators — can see what you deposited or how much you owe.',
  },
  {
    icon: 'enhanced_encryption',
    title: 'Anti-MEV Trading',
    description: 'The dark pool batches trades at oracle mid-price. Sealed-bid auctions use BHP256 commitments. No front-running, no sandwich attacks, no MEV extraction.',
  },
  {
    icon: 'shield',
    title: 'Complete DeFi Suite',
    description: 'Lend, borrow, earn yield, trade privately, bid in auctions, take flash loans, and govern the protocol — 7 contracts, 76 transitions, all with ZK privacy.',
  },
];

export function ProblemSolution() {
  const { ref, inView } = useScrollReveal({ threshold: 0.2 });

  return (
    <section id="architecture" ref={ref} className="py-section-mobile md:py-section bg-bg-primary">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center mb-20">
          <span className="font-label text-label uppercase tracking-[0.3em] text-secondary mb-4 block">
            Why DARA
          </span>
          <h2 className="font-headline text-section-mobile md:text-section text-text-primary mb-4">
            Your Money. Your Secret.
          </h2>
          <p className="text-[17px] text-text-secondary font-light max-w-[520px] mx-auto">
            On other platforms, every loan, trade, and balance is public. Bots exploit that data to front-run your transactions.
            DARA changes everything with a full-stack privacy DeFi suite.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ delay: i * 0.15, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <SpotlightCard className="h-full">
                <div className="p-8">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-2xl text-primary">
                      {feature.icon}
                    </span>
                  </div>
                  <h3 className="font-headline text-xl text-text-primary mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-text-secondary font-light">
                    {feature.description}
                  </p>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
