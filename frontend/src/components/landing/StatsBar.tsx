import { useProtocolStats } from '@/hooks/useProtocolStats';
import { useMarketPrice } from '@/hooks/useMarketPrice';
import { formatCredits } from '@/utils/formatting';
import { AnimatedCounter } from '@/components/shared/AnimatedCounter';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { motion } from 'framer-motion';

export function StatsBar() {
  const { data: stats, isLoading } = useProtocolStats();
  const { price: marketPrice } = useMarketPrice();
  const { ref, inView } = useScrollReveal({ threshold: 0.3 });

  const statItems = [
    {
      label: 'Total Value Locked',
      value: stats?.totalCollateral ? formatCredits(stats.totalCollateral) : null,
      suffix: ' ALEO',
      numericValue: stats?.totalCollateral ? stats.totalCollateral / 1_000_000 : 0,
    },
    {
      label: 'Private Loans',
      value: stats?.loanCount != null ? String(stats.loanCount) : null,
      suffix: '',
      numericValue: stats?.loanCount ?? 0,
      decimals: 0,
    },
    {
      label: 'Privacy Level',
      value: '100',
      suffix: '%',
      numericValue: 100,
      decimals: 0,
      tooltip: 'All positions encrypted by default',
    },
    {
      label: 'ALEO Price',
      value: marketPrice ? marketPrice.toFixed(4) : null,
      suffix: ' USD',
      numericValue: marketPrice ?? 0,
      decimals: 4,
    },
  ];

  return (
    <div
      ref={ref}
      className="absolute bottom-0 left-0 right-0 bg-[rgba(255,255,255,0.025)] border-t border-[rgba(255,255,255,0.05)]"
    >
      <div className="max-w-[1280px] mx-auto px-6 py-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {statItems.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: idx * 0.1,
                type: 'spring',
                stiffness: 120,
                damping: 20,
              }}
              className="text-center md:text-left"
            >
              <div className="mb-1">
                {isLoading && stat.numericValue === 0 ? (
                  <LoadingSkeleton width={80} height={28} className="mx-auto md:mx-0" />
                ) : stat.value === null ? (
                  <span className="font-mono text-2xl font-semibold text-text-primary tabular-nums">
                    —
                  </span>
                ) : (
                  <span className="font-mono text-2xl font-semibold text-text-primary tabular-nums">
                    {inView ? (
                      <AnimatedCounter
                        value={stat.numericValue}
                        decimals={stat.decimals ?? 2}
                        suffix={stat.suffix}
                      />
                    ) : (
                      `0${stat.suffix}`
                    )}
                  </span>
                )}
              </div>
              <p className="text-label uppercase text-text-muted tracking-widest">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
