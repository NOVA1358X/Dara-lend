import { Link } from 'react-router-dom';
import { useProtocolStats } from '@/hooks/useProtocolStats';
import { useMarketPrice } from '@/hooks/useMarketPrice';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { formatCredits, calculateHealthFactor, calculateMaxBorrow } from '@/utils/formatting';
import { PRECISION } from '@/utils/constants';
import { StatCard } from '@/components/shared/StatCard';
import { HealthFactorGauge } from '@/components/shared/HealthFactorGauge';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { OracleStatus } from '@/components/app/OracleStatus';
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
  const { price: marketPrice } = useMarketPrice();
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
  const maxBorrow = calculateMaxBorrow(totalCollateral, oraclePrice || PRECISION) - totalDebt;

  const isLoading = recordsLoading && wallet.connected;

  const healthColor = healthFactor === Infinity ? 'text-accent-success' :
    healthFactor >= 2.0 ? 'text-accent-success' :
    healthFactor >= 1.5 ? 'text-yellow-400' :
    healthFactor >= 1.0 ? 'text-orange-400' : 'text-red-500';

  const healthLabel = healthFactor === Infinity ? 'Safe — No Debt' :
    healthFactor >= 2.0 ? 'Healthy' :
    healthFactor >= 1.5 ? 'Caution' :
    healthFactor >= 1.0 ? 'At Risk' : 'Liquidation Danger';

  return (
    <div className="space-y-8">
      {/* Health Alert Banner */}
      {wallet.connected && !isLoading && totalDebt > 0 && healthFactor < 1.5 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border ${
            healthFactor < 1.0
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-orange-400/10 border-orange-400/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${healthFactor < 1.0 ? 'bg-red-500 animate-pulse' : 'bg-orange-400'}`} />
            <div>
              <p className={`text-sm font-semibold ${healthFactor < 1.0 ? 'text-red-400' : 'text-orange-300'}`}>
                {healthFactor < 1.0 ? 'Liquidation Risk — Health Factor Below 1.0' : 'Low Health Factor — Consider Repaying'}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Health: {healthFactor.toFixed(2)} | {healthFactor < 1.0
                  ? 'Your position may be liquidated. Repay debt immediately.'
                  : 'Your position is approaching the liquidation threshold.'}
              </p>
            </div>
          </div>
        </motion.div>
      )}
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
              <div>
                <HealthFactorGauge value={healthFactor} size={100} />
                <p className={`text-xs font-medium mt-1 ${healthColor}`}>{healthLabel}</p>
              </div>
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
            label="ALEO Price"
            value={
              marketPrice ? `$${marketPrice.toFixed(4)}` : '—'
            }
            loading={false}
          />
        </div>
      </div>

      {/* Oracle Price Feed */}
      <OracleStatus />

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
