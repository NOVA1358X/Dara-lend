import { Link } from 'react-router-dom';
import { useProtocolStats } from '@/hooks/useProtocolStats';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { formatCredits, calculateHealthFactor } from '@/utils/formatting';
import { PRECISION } from '@/utils/constants';
import { StatCard } from '@/components/shared/StatCard';
import { HealthFactorGauge } from '@/components/shared/HealthFactorGauge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { WalletIcon } from '@/components/icons/WalletIcon';
import { ArrowDownIcon } from '@/components/icons/ArrowDownIcon';
import { UnlockIcon } from '@/components/icons/UnlockIcon';
import { motion } from 'framer-motion';

interface DashboardProps {
  wallet: {
    requestRecords?: (program: string) => Promise<unknown[]>;
    decrypt?: (cipherText: string) => Promise<string>;
    connected: boolean;
  };
}

const quickActions = [
  {
    label: 'Supply Collateral',
    description: 'Lock ALEO as encrypted collateral',
    href: '/app/supply',
    icon: WalletIcon,
  },
  {
    label: 'Borrow',
    description: 'Borrow against your position',
    href: '/app/borrow',
    icon: ArrowDownIcon,
  },
  {
    label: 'Repay',
    description: 'Return borrowed assets',
    href: '/app/repay',
    icon: UnlockIcon,
  },
];

export function Dashboard({ wallet }: DashboardProps) {
  const { data: stats, isLoading: statsLoading } = useProtocolStats();
  const { collateralReceipts, debtPositions, isLoading: recordsLoading } =
    useWalletRecords(wallet);

  const totalCollateral = collateralReceipts.reduce(
    (sum, r) => sum + r.collateralAmount, 0,
  );
  const totalDebt = debtPositions.reduce(
    (sum, r) => sum + r.debtAmount, 0,
  );
  const oraclePrice = stats?.oraclePrice || 0;
  const healthFactor = totalDebt > 0
    ? calculateHealthFactor(totalCollateral, totalDebt, oraclePrice || PRECISION)
    : Infinity;
  const maxBorrow = Math.floor((totalCollateral * 700_000) / PRECISION) - totalDebt;

  const isLoading = recordsLoading && wallet.connected;

  return (
    <div className="space-y-8">
      {/* User Position Stats */}
      <div>
        <h2 className="text-label uppercase text-text-muted tracking-widest mb-4">
          Your Position
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Your Collateral"
            value={
              !wallet.connected ? '—' : isLoading ? '' : `${formatCredits(totalCollateral)} ALEO`
            }
            loading={isLoading}
          />
          <StatCard
            label="Your Debt"
            value={
              !wallet.connected ? '—' : isLoading ? '' : `${formatCredits(totalDebt)} USDCx`
            }
            loading={isLoading}
          />
          <div className="rounded-card bg-bg-tertiary p-5 border border-transparent hover:border-border-default transition-all duration-200">
            <p className="text-label uppercase text-text-muted tracking-widest mb-2">
              Health Factor
            </p>
            {!wallet.connected ? (
              <p className="text-2xl font-semibold font-mono text-text-primary tabular-nums">—</p>
            ) : isLoading ? (
              <LoadingSkeleton width="80%" height={32} />
            ) : (
              <HealthFactorGauge value={healthFactor} size={100} />
            )}
          </div>
          <StatCard
            label="Available to Borrow"
            value={
              !wallet.connected
                ? '—'
                : isLoading
                ? ''
                : `${formatCredits(Math.max(0, maxBorrow))} USDCx`
            }
            loading={isLoading}
          />
        </div>
      </div>

      {/* Protocol Overview */}
      <div>
        <h2 className="text-label uppercase text-text-muted tracking-widest mb-4">
          Protocol Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Value Locked"
            value={stats ? `${formatCredits(stats.totalCollateral)} ALEO` : '—'}
            loading={statsLoading}
          />
          <StatCard
            label="Total Borrowed"
            value={stats ? `${formatCredits(stats.totalBorrowed)} USDCx` : '—'}
            loading={statsLoading}
          />
          <StatCard
            label="Active Loans"
            value={stats ? String(stats.loanCount) : '—'}
            loading={statsLoading}
          />
          <StatCard
            label="Utilization Rate"
            value={
              stats
                ? `${(stats.utilizationRate * 100).toFixed(1)}%`
                : '—'
            }
            loading={statsLoading}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-label uppercase text-text-muted tracking-widest mb-4">
          Quick Actions
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: idx * 0.08,
                  type: 'spring',
                  stiffness: 120,
                  damping: 20,
                }}
              >
                <Link
                  to={action.href}
                  className="block p-5 rounded-card bg-bg-tertiary border border-transparent hover:border-border-default hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                    <Icon size={18} className="text-accent" />
                  </div>
                  <h3 className="font-heading text-base font-semibold text-text-primary mb-1">
                    {action.label}
                  </h3>
                  <p className="text-sm text-text-secondary">{action.description}</p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
