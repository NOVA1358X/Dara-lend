import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { LockIcon } from '@/components/icons/LockIcon';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { EyeOffIcon } from '@/components/icons/EyeOffIcon';

const exposedRows = [
  { label: 'Collateral', value: '10.00 ALEO' },
  { label: 'Debt', value: '6.50 ALEO' },
  { label: 'Health Factor', value: '1.12' },
  { label: 'Liquidation Price', value: '$1.34' },
];

const encryptedBlock = '██████████';
const scrambleChars = '0123456789abcdef!@#$%';

function ScrambleText({ revealed }: { revealed: boolean }) {
  const [text, setText] = useState(encryptedBlock);

  useEffect(() => {
    if (!revealed) return;
    let frame = 0;
    const totalFrames = 12;
    const interval = setInterval(() => {
      frame++;
      if (frame >= totalFrames) {
        setText(encryptedBlock);
        clearInterval(interval);
        return;
      }
      const scrambled = Array.from({ length: 10 }, () =>
        scrambleChars[Math.floor(Math.random() * scrambleChars.length)],
      ).join('');
      setText(scrambled);
    }, 50);
    return () => clearInterval(interval);
  }, [revealed]);

  return <span className="encrypted-text">{text}</span>;
}

const botLabels = ['MEV Bot', 'Liquidator', 'Frontrunner'];

export function ProblemSolution() {
  const { ref, inView } = useScrollReveal();

  return (
    <section id="privacy" className="py-section-mobile md:py-section bg-bg-primary">
      <div className="max-w-[1280px] mx-auto px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <p className="text-label uppercase text-accent tracking-widest mb-4">
            The Problem
          </p>
          <h2 className="font-heading text-section-mobile md:text-section text-text-primary max-w-xl mb-16">
            Traditional lending leaves you exposed.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-[55%_45%] gap-6">
          {/* Transparent Chains Card */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 20 }}
            className="rounded-xl p-8 md:p-9 bg-[rgba(239,68,68,0.03)] border border-transparent hover:border-[rgba(239,68,68,0.15)] transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider bg-accent-danger/10 text-accent-danger border border-accent-danger/10">
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Public Ledger
              </span>
            </div>

            <div className="space-y-3">
              {exposedRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[rgba(239,68,68,0.03)]"
                >
                  <span className="text-sm text-text-secondary">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-text-primary tabular-nums">
                      {row.value}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-accent-danger/10 text-accent-danger">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-danger animate-pulse-dot" />
                      Exposed
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 pt-4">
              {botLabels.map((label, idx) => (
                <div key={label} className="flex items-center gap-1.5 text-accent-danger/60">
                  <div
                    className="w-6 h-6 rounded-full border border-accent-danger/30 flex items-center justify-center"
                    style={{
                      animation: `orbit 8s linear infinite ${idx * 2.66}s`,
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-accent-danger/50" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-medium text-accent-danger/50">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* DARA Lend Card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 20 }}
            className="rounded-xl p-8 md:p-9 bg-[rgba(0,229,204,0.03)] border border-transparent hover:border-[rgba(0,229,204,0.15)] transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider bg-accent/10 text-accent border border-accent/10">
                <ShieldIcon size={12} />
                Zero-Knowledge Private
              </span>
            </div>

            <div className="space-y-3">
              {exposedRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[rgba(0,229,204,0.03)]"
                >
                  <span className="text-sm text-text-secondary">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <ScrambleText revealed={inView} />
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-accent-success/10 text-accent-success">
                      <LockIcon size={10} />
                      Encrypted
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 pt-4 text-accent/60">
              <ShieldIcon size={20} className="animate-float" />
              <span className="text-xs font-medium text-accent/60">
                Protected by Aleo zkVM
              </span>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, type: 'spring', stiffness: 120, damping: 20 }}
          className="text-center text-lg italic text-text-secondary max-w-[660px] mx-auto mt-16"
        >
          On Ethereum, MEV bots extracted over $600M in 2023 by targeting visible
          liquidation thresholds. On DARA Lend, that number is zero.
        </motion.p>
      </div>
    </section>
  );
}
