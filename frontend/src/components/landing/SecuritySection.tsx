import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { KeyIcon } from '@/components/icons/KeyIcon';
import { ChartIcon } from '@/components/icons/ChartIcon';

const cards = [
  {
    icon: ShieldIcon,
    title: 'Zero-Knowledge Proofs',
    description:
      "Every position is validated inside Aleo's zkVM. The network verifies your collateral covers your debt without ever seeing the amounts.",
    wide: true,
  },
  {
    icon: KeyIcon,
    title: 'Self-Custodial',
    description:
      "Your collateral is locked in the program's on-chain balance via credits.aleo. No intermediary. Only your private key.",
    wide: false,
  },
  {
    icon: ChartIcon,
    title: 'Verifiable Solvency',
    description:
      'Anyone can verify protocol solvency using on-chain BHP256 commitments — a hash proving total collateral exceeds total debt.',
    wide: false,
  },
];

export function SecuritySection() {
  const { ref, inView } = useScrollReveal();

  return (
    <section id="security" className="py-section-mobile md:py-section bg-bg-primary">
      <div className="max-w-[1280px] mx-auto px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="mb-16"
        >
          <p className="text-label uppercase text-accent tracking-widest mb-4">
            Security
          </p>
          <h2 className="font-heading text-section-mobile md:text-section text-text-primary max-w-xl">
            Trustless. Self-custodial. Provable.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  delay: 0.15 + idx * 0.1,
                  type: 'spring',
                  stiffness: 120,
                  damping: 20,
                }}
                className={`rounded-xl p-8 bg-bg-tertiary border border-transparent hover:border-[rgba(255,255,255,0.06)] hover:-translate-y-0.5 transition-all duration-200 ${
                  card.wide ? 'md:col-span-2 lg:col-span-1 lg:row-span-2' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-5">
                  <Icon size={20} className="text-accent" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-text-primary mb-3">
                  {card.title}
                </h3>
                <p className="text-[15px] text-text-secondary leading-relaxed">
                  {card.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
