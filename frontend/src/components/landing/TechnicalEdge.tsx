import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { SpotlightCard } from '@/components/shared/SpotlightCard';

const advantages = [
  { title: '7 Production Smart Contracts', desc: 'Lending, credits, vault, governance, dark pool, auctions, and flash loans — 76 transitions deployed on Aleo with ~5M compiled variables.', icon: 'architecture' },
  { title: 'Real-Time Oracle (5 Sources)', desc: 'Prices from CoinGecko, Coinbase, Gate.io, CryptoCompare, and CMC — cross-checked, outlier-rejected, pushed on-chain every 30 minutes.', icon: 'monitoring' },
  { title: 'Anti-MEV by Design', desc: 'Sealed-bid auctions with BHP256 commitments, dark pool batch settlement at oracle price — front-running is mathematically impossible.', icon: 'enhanced_encryption' },
  { title: 'Private Governance (ZK Votes)', desc: 'Vote on proposals without revealing your identity. No finalize, no on-chain trace — the first truly private DAO on Aleo.', icon: 'how_to_vote' },
  { title: 'Flash Loans (0.09% Fee)', desc: 'Borrow instantly in 4 atomic steps with 102% collateral. Bidirectional ALEO↔USDCx. All receipts are private records.', icon: 'bolt' },
  { title: 'Fully Automated Protocol', desc: 'Oracle, interest, yield, liquidation, dark pool settlement, and auction bots run headlessly via Provable DPS — zero manual intervention.', icon: 'smart_toy' },
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
              DARA was designed from scratch as a complete privacy DeFi suite — lending, trading, auctions, flash loans, and governance, all invisible.
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
