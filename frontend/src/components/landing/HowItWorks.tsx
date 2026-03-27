import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const steps = [
  { num: '01', title: 'Connect Wallet', desc: 'Link Shield Wallet — your address stays private throughout. All 13 app pages at your fingertips.' },
  { num: '02', title: 'Supply & Borrow', desc: 'Deposit ALEO, USDCx, or USAD as collateral. Borrow any token at up to 70% LTV — encrypted in ZK proofs.' },
  { num: '03', title: 'Earn Yield', desc: 'Deposit stablecoins into the Yield Vault. Earn protocol fees. Redeem PoolShare records for deposit + rewards.' },
  { num: '04', title: 'Transfer Privately', desc: 'ZK-shielded relay breaks all on-chain links. Repay, withdraw, or transfer — everything stays invisible.' },
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
          <h2 className="font-headline text-section-mobile md:text-section text-text-primary">
            Four Steps to Privacy
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="relative"
            >
              <span className="font-headline text-stat-mobile signature-text-gradient block mb-4">
                {step.num}
              </span>
              <h3 className="font-label text-sm uppercase tracking-[0.15em] text-text-primary mb-2">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary font-light">
                {step.desc}
              </p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 right-0 w-full h-px bg-gradient-to-r from-white/10 to-transparent translate-x-1/2" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
