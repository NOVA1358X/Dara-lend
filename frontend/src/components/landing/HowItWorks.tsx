import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { WalletIcon } from '@/components/icons/WalletIcon';
import { LockIcon } from '@/components/icons/LockIcon';
import { ArrowDownIcon } from '@/components/icons/ArrowDownIcon';
import { UnlockIcon } from '@/components/icons/UnlockIcon';

const steps = [
  {
    number: '01',
    icon: WalletIcon,
    title: 'Connect Shield Wallet',
    description:
      "Link your Shield Wallet — Aleo's privacy-native wallet built by Provable. Your identity stays yours.",
  },
  {
    number: '02',
    icon: LockIcon,
    title: 'Supply Collateral',
    description:
      'Deposit ALEO tokens into an encrypted vault. Your collateral amount is hidden inside a zero-knowledge proof.',
  },
  {
    number: '03',
    icon: ArrowDownIcon,
    title: 'Borrow Privately',
    description:
      'Borrow USDCx stablecoin against your encrypted position. Your debt and liquidation price are invisible to everyone.',
  },
  {
    number: '04',
    icon: UnlockIcon,
    title: 'Repay and Unlock',
    description:
      'Return borrowed assets to dissolve your debt record and reclaim your collateral. Zero trace left on-chain.',
  },
];

export function HowItWorks() {
  const { ref, inView } = useScrollReveal();

  return (
    <section id="how-it-works" className="py-section-mobile md:py-section bg-bg-secondary">
      <div className="max-w-[1280px] mx-auto px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <p className="text-label uppercase text-accent tracking-widest mb-4">
            How It Works
          </p>
          <h2 className="font-heading text-section-mobile md:text-section text-text-primary max-w-xl mb-16">
            Four steps to invisible borrowing.
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  delay: 0.15 + idx * 0.08,
                  type: 'spring',
                  stiffness: 120,
                  damping: 20,
                }}
                className={`relative rounded-xl p-8 bg-bg-tertiary border border-transparent hover:border-[rgba(255,255,255,0.06)] transition-all duration-200 hover:-translate-y-0.5 ${
                  idx === 0 ? 'lg:col-span-1' : ''
                }`}
              >
                <span className="absolute top-4 right-4 font-mono text-[64px] font-bold leading-none text-[rgba(255,255,255,0.04)] select-none">
                  {step.number}
                </span>

                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-accent" />
                </div>

                <h3 className="font-heading text-xl font-semibold text-text-primary mb-2">
                  {step.title}
                </h3>
                <p className="text-[15px] text-text-secondary leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
