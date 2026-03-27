import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { SpotlightCard } from '@/components/shared/SpotlightCard';

const steps = [
  { num: '01', title: 'Connect Wallet', desc: 'Open the app and connect your Shield Wallet. Your address is never exposed on-chain — privacy starts at login.' },
  { num: '02', title: 'Deposit & Borrow', desc: 'Choose your collateral, set your amount, and borrow instantly. Everything is encrypted — no one sees your position.' },
  { num: '03', title: 'Earn Yield', desc: 'Deposit stablecoins into the Yield Vault. Your deposits grow automatically with protocol fees, all in private.' },
  { num: '04', title: 'Transfer Privately', desc: 'Send tokens to anyone without leaving a public trail. The link between sender and receiver is completely broken.' },
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
            Private Lending in Four Steps
          </h2>
          <p className="text-[17px] text-text-secondary font-light max-w-[480px] mx-auto">
            From deposit to withdrawal, every step keeps your data fully encrypted. Here's how simple it is.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
