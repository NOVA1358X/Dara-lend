import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { SpotlightCard } from '@/components/shared/SpotlightCard';

const advantages = [
  { title: 'Battle-Tested Architecture', desc: 'Two verified smart contracts running on Aleo — purpose-built for private lending and earning.', icon: 'architecture' },
  { title: 'Real-Time Price Feeds', desc: 'Prices pulled from 5 independent sources (CoinGecko, Coinbase, Gate.io, CryptoCompare, CMC), cross-checked, and pushed on-chain every 30 minutes automatically.', icon: 'monitoring' },
  { title: 'Fully Private Records', desc: 'Your deposits, loans, and transfers each generate encrypted records only you can read — nothing is public.', icon: 'enhanced_encryption' },
  { title: 'Fully Automated Protocol', desc: 'Oracle, interest accrual, and yield distribution run headlessly via Provable DPS — no manual intervention needed. Admin Panel always available as fallback.', icon: 'smart_toy' },
  { title: 'Earn While You Sleep', desc: 'Deposit stablecoins into the yield vault and earn interest privately — withdraw anytime with zero trace.', icon: 'savings' },
];

export function TechnicalEdge() {
  const { ref, inView } = useScrollReveal({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-section-mobile md:py-section bg-bg-primary">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="font-label text-label uppercase tracking-[0.3em] text-secondary mb-4 block">
              Why Choose DARA
            </span>
            <h2 className="font-headline text-section-mobile md:text-section text-text-primary mb-6">
              Built Different.<br />Built Private.
            </h2>
            <p className="text-[17px] leading-relaxed text-text-secondary font-light max-w-[440px]">
              Most DeFi protocols expose everything — your balances, your strategies, your identity.
              DARA Lend was designed from scratch so that privacy is the default, not an afterthought.
            </p>
          </div>

          <div className="space-y-4">
            {advantages.map((point, i) => (
              <motion.div
                key={point.title}
                initial={{ opacity: 0, x: 30 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.12, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <SpotlightCard className="glass-panel-sm !rounded-xl">
                  <div className="p-6 flex gap-5 items-start">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl text-primary">{point.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-text-primary mb-1">{point.title}</h3>
                      <p className="text-sm text-text-secondary font-light">{point.desc}</p>
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
