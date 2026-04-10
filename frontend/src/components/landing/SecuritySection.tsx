import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { SpotlightCard } from '@/components/shared/SpotlightCard';

const comparisons = [
  {
    label: 'Traditional DeFi',
    points: [
      { text: 'Balances visible to anyone', bad: true },
      { text: 'Wallet history fully traceable', bad: true },
      { text: 'Front-running & MEV attacks', bad: true },
      { text: 'Liquidation positions are public', bad: true },
    ],
  },
  {
    label: 'DARA',
    points: [
      { text: 'Balances encrypted by default', bad: false },
      { text: 'Zero-knowledge proof-based history', bad: false },
      { text: 'Invisible to bots & extractors', bad: false },
      { text: 'Private liquidation protection', bad: false },
    ],
  },
];

const trustFactors = [
  { icon: 'verified_user', title: 'Verified On-Chain', desc: 'Smart contracts deployed and verifiable on Aleo Testnet.' },
  { icon: 'open_in_new', title: 'Open Source', desc: 'Full codebase available for review — nothing hidden.' },
  { icon: 'hub', title: 'Decentralized Oracles', desc: 'Prices sourced from 5 independent feeds with outlier rejection.' },
];

export function SecuritySection() {
  const { ref, inView } = useScrollReveal({ threshold: 0.2 });

  return (
    <section ref={ref} className="py-section-mobile md:py-section bg-bg-secondary">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center mb-16">
          <span className="font-label text-label uppercase tracking-[0.3em] text-secondary mb-4 block">
            The Difference
          </span>
          <h2 className="font-headline text-section-mobile md:text-section text-text-primary mb-4">
            DeFi Was Never Private.<br />Until Now.
          </h2>
          <p className="text-[17px] text-text-secondary font-light max-w-[520px] mx-auto">
            See how DARA compares to every other DeFi protocol.
          </p>
        </div>

        {/* Comparison cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {comparisons.map((col, i) => (
            <motion.div
              key={col.label}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.6 }}
            >
              <SpotlightCard
                className="h-full"
                spotlightColor={i === 1 ? 'rgba(201, 221, 255, 0.08)' : 'rgba(214, 197, 161, 0.04)'}
              >
                <div className="p-8">
                  <h3 className={`font-headline text-xl mb-6 ${
                    i === 1 ? 'signature-text-gradient' : 'text-text-muted'
                  }`}>
                    {col.label}
                  </h3>
                  <div className="space-y-4">
                    {col.points.map((p) => (
                      <div key={p.text} className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-lg ${
                          p.bad ? 'text-red-400/70' : 'text-emerald-400'
                        }`}>
                          {p.bad ? 'close' : 'check_circle'}
                        </span>
                        <span className="text-[15px] text-text-secondary font-light">{p.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>

        {/* Trust factors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trustFactors.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-2xl text-primary">{f.icon}</span>
              </div>
              <h4 className="text-sm font-medium text-text-primary mb-1">{f.title}</h4>
              <p className="text-sm text-text-secondary font-light">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
