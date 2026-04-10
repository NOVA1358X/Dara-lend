import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { SpotlightCard } from '@/components/shared/SpotlightCard';

const steps = [
  { num: '01', title: 'Supply & Borrow', desc: 'Deposit ALEO or stablecoins as collateral, then borrow instantly. Your position is encrypted — no one sees your balance or liquidation price.' },
  { num: '02', title: 'Earn Yield', desc: 'Deposit stablecoins into the Yield Vault. Your deposits grow automatically with protocol fees, all in zero-knowledge privacy.' },
  { num: '03', title: 'Dark Pool Trading', desc: 'Submit buy or sell intents into the private dark pool. Trades batch-settle at oracle mid-price — no front-running, no MEV.' },
  { num: '04', title: 'Flash Loans', desc: 'Borrow instantly with 102% collateral and just 0.09% fee. Four atomic steps: lock → claim → repay → withdraw. All private.' },
  { num: '05', title: 'Sealed-Bid Auctions', desc: 'Bid on liquidated collateral using BHP256 commitments. No one sees your bid until reveal — the first anti-MEV auction on Aleo.' },
  { num: '06', title: 'Govern & Vote', desc: 'Claim governance tokens, create proposals, and vote with ZK privacy. Your vote is never exposed on-chain — true private governance.' },
];

export function HowItWorks() {
  const { ref, inView } = useScrollReveal({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-section-mobile md:py-section bg-bg-secondary">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center mb-20">
          <span className="font-label text-label uppercase tracking-[0.3em] text-secondary mb-4 block">
            How It Works
          </span>
          <h2 className="font-headline text-section-mobile md:text-section text-text-primary mb-4">
            Six Modules. Total Privacy.
          </h2>
          <p className="text-[17px] text-text-secondary font-light max-w-[480px] mx-auto">
            From lending to trading to flash loans — every action keeps your data fully encrypted. Here's what you can do.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 40, scale: 0.93 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ delay: i * 0.12, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative group"
            >
              <SpotlightCard className="h-full" spotlightColor="rgba(214, 197, 161, 0.05)">
                <div className="p-6">
                  <span className="font-headline text-stat-mobile signature-text-gradient block mb-4">
                    {step.num}
                  </span>
                  <h3 className="font-label text-sm uppercase tracking-[0.15em] text-text-primary mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-secondary font-light">
                    {step.desc}
                  </p>
                </div>
              </SpotlightCard>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 right-0 w-full h-px bg-gradient-to-r from-white/10 to-transparent translate-x-1/2" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
