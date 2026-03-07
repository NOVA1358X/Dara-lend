import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ShieldIcon } from '@/components/icons/ShieldIcon';

const chains = [
  { symbol: 'E', label: 'Ethereum' },
  { symbol: 'A', label: 'Arbitrum' },
  { symbol: 'B', label: 'Base' },
  { symbol: 'S', label: 'Solana' },
  { symbol: 'N', label: 'NEAR' },
];

const features = [
  'No Gas Management',
  'No Wallet Switching',
  'No Chain-Specific UX',
];

export function CrossChainSection() {
  const { ref, inView } = useScrollReveal();

  return (
    <section id="cross-chain" className="py-section-mobile md:py-section bg-bg-secondary">
      <div className="max-w-[1280px] mx-auto px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="mb-16"
        >
          <p className="text-label uppercase text-accent tracking-widest mb-4">
            Cross-Chain
          </p>
          <h2 className="font-heading text-section-mobile md:text-section text-text-primary max-w-xl">
            Supply from anywhere. Borrow privately.
          </h2>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Chain circles */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 20 }}
            className="relative flex flex-wrap justify-center gap-4 lg:gap-5"
          >
            {chains.map((chain, idx) => (
              <motion.div
                key={chain.symbol}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{
                  delay: 0.3 + idx * 0.08,
                  type: 'spring',
                  stiffness: 120,
                  damping: 20,
                }}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-text-primary font-heading text-sm font-semibold">
                  {chain.symbol}
                </div>
                <span className="text-[10px] text-text-muted">{chain.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Connecting dots */}
          <div className="hidden lg:flex items-center gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 0.3 } : {}}
                transition={{ delay: 0.5 + i * 0.04 }}
                className="w-1 h-1 rounded-full bg-text-muted"
              />
            ))}
          </div>

          {/* Shield destination */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.4, type: 'spring', stiffness: 120, damping: 20 }}
            className="flex flex-col items-center lg:items-start"
          >
            <div className="w-20 h-20 rounded-2xl bg-accent/5 border border-accent/10 flex items-center justify-center mb-4">
              <ShieldIcon size={32} className="text-accent" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-text-primary mb-1">
              DARA Lend
            </h3>
            <p className="text-sm text-text-secondary mb-6">Private Vault</p>

            <div className="flex flex-wrap gap-2 mb-6">
              {features.map((feature) => (
                <span
                  key={feature}
                  className="px-3 py-1.5 rounded-full text-[13px] text-text-secondary bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]"
                >
                  {feature}
                </span>
              ))}
            </div>

            <p className="text-base text-text-secondary leading-relaxed max-w-[540px]">
              Shield Wallet integrates NEAR Intents natively. Swap from Ethereum, Solana,
              or any of 100+ assets across 35+ chains — directly into your DARA Lend
              position.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, type: 'spring', stiffness: 120, damping: 20 }}
          className="mt-12 flex items-center justify-center gap-6"
        >
          <span className="text-xs text-text-muted uppercase tracking-wider">
            Powered by
          </span>
          {['Aleo', 'NEAR Protocol', 'Shield Wallet'].map((name) => (
            <span
              key={name}
              className="text-xs text-text-muted font-medium"
            >
              {name}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
