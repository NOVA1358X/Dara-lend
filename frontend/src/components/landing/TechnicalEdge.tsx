import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { ZapIcon } from '@/components/icons/ZapIcon';
import { LockIcon } from '@/components/icons/LockIcon';
import { ChartIcon } from '@/components/icons/ChartIcon';

const features = [
  {
    icon: ChartIcon,
    title: 'Automated Oracle Price Feed',
    description:
      'Multi-source oracle fetching live ALEO/USD from CoinGecko and CryptoCompare with cached fallback. Updates on-chain every 2 minutes automatically — no manual admin intervention.',
    tag: 'Automated',
  },
  {
    icon: ShieldIcon,
    title: 'On-Chain Oracle Validation',
    description:
      'The smart contract enforces a 15% deviation cap per update and round-based replay protection. Prices remain valid until refreshed — no staleness lockouts for users.',
    tag: 'Safety',
  },
  {
    icon: ZapIcon,
    title: 'Circuit Breaker & Emergency Pause',
    description:
      'Admin can instantly freeze the protocol if anomalies are detected. Protects user collateral during flash crashes, oracle failures, or exploit attempts.',
    tag: 'Protection',
  },
  {
    icon: LockIcon,
    title: 'End-to-End Private Token Flows',
    description:
      'All token transfers use private functions — transfer_private_to_public for supply, transfer_public_to_private for borrow/withdraw/liquidate. Participant identities are hidden at the transfer layer.',
    tag: 'Privacy',
  },
];

export function TechnicalEdge() {
  const { ref, inView } = useScrollReveal();

  return (
    <section className="py-section-mobile md:py-section bg-bg-secondary/50">
      <div className="max-w-[1280px] mx-auto px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="mb-12"
        >
          <p className="text-label uppercase text-accent tracking-widest mb-4">
            Technical Edge
          </p>
          <h2 className="font-heading text-section-mobile md:text-section text-text-primary max-w-2xl">
            Production-Grade DeFi Infrastructure
          </h2>
          <p className="text-base text-text-secondary mt-4 max-w-xl">
            Beyond basic lending — automated oracle feeds, on-chain safety mechanisms,
            and economic incentives built into the smart contract layer.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  delay: 0.15 + idx * 0.1,
                  type: 'spring',
                  stiffness: 120,
                  damping: 20,
                }}
                className="p-6 rounded-xl bg-bg-tertiary border border-border-default hover:border-accent/20 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-heading text-base font-semibold text-text-primary">
                        {feature.title}
                      </h3>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                        {feature.tag}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
