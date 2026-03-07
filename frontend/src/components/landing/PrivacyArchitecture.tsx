import { motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { LockIcon } from '@/components/icons/LockIcon';
import { CheckIcon } from '@/components/icons/CheckIcon';
import { ShieldIcon } from '@/components/icons/ShieldIcon';

const privateItems = [
  'Collateral Amount',
  'Debt Size',
  'Health Factor',
  'Liquidation Price',
  'Wallet ↔ Loan Link',
];

const publicItems = [
  'Total Protocol TVL',
  'Active Loan Count',
  'Oracle Price',
  'Solvency Proof',
];

export function PrivacyArchitecture() {
  const { ref, inView } = useScrollReveal();

  return (
    <section className="py-section-mobile md:py-section bg-bg-primary">
      <div className="max-w-[1280px] mx-auto px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="mb-16"
        >
          <p className="text-label uppercase text-accent tracking-widest mb-4">
            Architecture
          </p>
          <h2 className="font-heading text-section-mobile md:text-section text-text-primary max-w-xl">
            What stays hidden. What stays public.
          </h2>
        </motion.div>

        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
          {/* Private items */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 20 }}
            className="space-y-3 w-full lg:w-auto"
          >
            <p className="text-label uppercase text-accent tracking-widest mb-4">
              Private
            </p>
            {privateItems.map((item, idx) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{
                  delay: 0.4 + idx * 0.06,
                  type: 'spring',
                  stiffness: 120,
                  damping: 20,
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bg-tertiary border-l-2 border-accent/30"
              >
                <LockIcon size={14} className="text-accent flex-shrink-0" />
                <span className="text-sm text-text-primary">{item}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Central shield */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 20 }}
            className="flex-shrink-0"
          >
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-accent/20 flex flex-col items-center justify-center relative">
              <div className="absolute inset-2 rounded-full border border-accent/10 animate-float" />
              <ShieldIcon size={40} className="text-accent mb-2" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Your Position
              </span>
            </div>

            {/* Connection lines (hidden on mobile) */}
            <svg
              className="absolute top-1/2 left-0 w-full h-px hidden lg:block pointer-events-none"
              style={{ transform: 'translateY(-50%)', overflow: 'visible' }}
            >
              {/* Dashed lines left */}
              <line
                x1="0"
                y1="0"
                x2="100"
                y2="0"
                stroke="rgba(0,229,204,0.15)"
                strokeWidth="1"
                strokeDasharray="4 4"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-8"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </line>
            </svg>
          </motion.div>

          {/* Public items */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.4, type: 'spring', stiffness: 120, damping: 20 }}
            className="space-y-3 w-full lg:w-auto"
          >
            <p className="text-label uppercase text-accent-success tracking-widest mb-4">
              Public
            </p>
            {publicItems.map((item, idx) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: 20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{
                  delay: 0.5 + idx * 0.06,
                  type: 'spring',
                  stiffness: 120,
                  damping: 20,
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bg-tertiary border-l-2 border-accent-success/30"
              >
                <CheckIcon size={14} className="text-accent-success flex-shrink-0" />
                <span className="text-sm text-text-primary">{item}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7, type: 'spring', stiffness: 120, damping: 20 }}
          className="text-center text-base italic text-text-muted max-w-md mx-auto mt-16"
        >
          Privacy isn't a feature — it's the architecture.
        </motion.p>
      </div>
    </section>
  );
}
