import { motion } from 'framer-motion';
import { useProtocolStats } from '@/hooks/useProtocolStats';
import { formatCredits } from '@/utils/formatting';
import { PRECISION } from '@/utils/constants';
import { StatCard } from '@/components/shared/StatCard';
import { PrivacyBadge } from '@/components/shared/PrivacyBadge';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { CheckIcon } from '@/components/icons/CheckIcon';

export function ProtocolStats() {
  const { data: stats, isLoading } = useProtocolStats();

  const isSolvent = stats
    ? stats.totalCollateral >= stats.totalBorrowed
    : false;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      >
        <h2 className="text-label uppercase text-text-muted tracking-widest mb-4">
          Protocol Statistics
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Value Locked"
            value={stats ? `${formatCredits(stats.totalCollateral)} ALEO` : '—'}
            loading={isLoading}
          />
          <StatCard
            label="Total Borrowed"
            value={stats ? `${formatCredits(stats.totalBorrowed)} USDCx` : '—'}
            loading={isLoading}
          />
          <StatCard
            label="Active Loans"
            value={stats ? String(stats.loanCount) : '—'}
            loading={isLoading}
          />
          <StatCard
            label="Oracle Price"
            value={
              stats?.oraclePrice
                ? `$${(stats.oraclePrice / PRECISION).toFixed(4)}`
                : '—'
            }
            loading={isLoading}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 20 }}
      >
        <h2 className="text-label uppercase text-text-muted tracking-widest mb-4">
          Utilization
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Utilization Rate"
            value={
              stats
                ? `${(stats.utilizationRate * 100).toFixed(1)}%`
                : '—'
            }
            loading={isLoading}
          />
          <StatCard
            label="Available Liquidity"
            value={
              stats
                ? `${formatCredits(Math.max(0, stats.totalCollateral - stats.totalBorrowed))} ALEO`
                : '—'
            }
            loading={isLoading}
          />
        </div>
      </motion.div>

      {/* Protocol Solvency */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl bg-bg-tertiary border border-border-default p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldIcon size={20} className="text-accent" />
            <h3 className="font-heading text-lg font-semibold text-text-primary">
              Protocol Solvency
            </h3>
          </div>
          <PrivacyBadge variant="verified" />
        </div>

        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          All positions are stored as encrypted private records on Aleo. Collateral and 
          debt totals are tracked in public mappings for transparency — anyone can verify 
          the protocol remains solvent without seeing individual positions.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-4 rounded-lg bg-bg-secondary">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
              Total Collateral
            </p>
            <p className="font-mono text-sm text-text-primary tabular-nums">
              {stats ? `${formatCredits(stats.totalCollateral)} ALEO` : '—'}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-bg-secondary">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
              Total Debt
            </p>
            <p className="font-mono text-sm text-text-primary tabular-nums">
              {stats ? `${formatCredits(stats.totalBorrowed)} USDCx` : '—'}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-2 ${isSolvent ? 'text-accent-success' : 'text-accent-danger'}`}>
          <CheckIcon size={16} />
          <span className="text-sm font-medium">
            {isSolvent ? 'Protocol is Solvent — Verifiable On-Chain' : 'Warning: Under-collateralized'}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
