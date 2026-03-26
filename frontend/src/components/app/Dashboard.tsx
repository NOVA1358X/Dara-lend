import { Link } from 'react-router-dom';
import { useProtocolStats } from '@/hooks/useProtocolStats';
import { useMarketPrice } from '@/hooks/useMarketPrice';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { formatCredits, calculateHealthFactor, calculateMaxBorrow } from '@/utils/formatting';
import { PRECISION, TOKEN_TYPES } from '@/utils/constants';
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

  // Separate ALEO and stablecoin collateral for correct USD value computation
  const totalCollateralAleo = collateralReceipts
    .filter(r => r.tokenType === TOKEN_TYPES.ALEO)
    .reduce((sum, r) => sum + r.collateralAmount, 0);
  const totalCollateralStable = collateralReceipts
    .filter(r => r.tokenType === TOKEN_TYPES.USDCX || r.tokenType === TOKEN_TYPES.USAD)
    .reduce((sum, r) => sum + r.collateralAmountU128, 0);
  const oraclePrice = stats?.oraclePrice || 0;
  const aleoPrice = oraclePrice || PRECISION;

  // Total debt in USD (microdollars): ALEO debt at oracle price, stablecoin debt at $1
  const totalDebtUsd = debtPositions.reduce((sum, r) => {
    const dt = r.debtToken ?? 0;
    if (dt === TOKEN_TYPES.ALEO) return sum + Math.floor((r.debtAmount * aleoPrice) / PRECISION);
    return sum + r.debtAmount; // USDCx/USAD already in microdollars
  }, 0);

  // Total collateral value in USD (microdollars)
  const totalCollateralValueUsd = Math.floor((totalCollateralAleo * aleoPrice) / PRECISION) + totalCollateralStable;

  const healthFactor = totalDebtUsd > 0
    ? ((totalCollateralValueUsd * 800_000) / PRECISION) / totalDebtUsd
    : Infinity;
  const maxBorrow = Math.floor((totalCollateralValueUsd * 7_000) / 10_000) - totalDebtUsd;

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
      {wallet.connected && !isLoading && totalDebtUsd > 0 && healthFactor < 1.5 && (
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
        <h2 className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">
          Your Position
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Your Collateral"
            value={
              !wallet.connected ? '—' : isLoading ? '' : `$${formatCredits(totalCollateralValueUsd)}`
            }
            loading={isLoading}
          />
          <StatCard
            label="Your Debt"
            value={
              !wallet.connected ? '—' : isLoading ? '' : `$${formatCredits(totalDebtUsd)}`
            }
            loading={isLoading}
          />
          <div className="rounded-card glass-panel-sm p-5">
            <p className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-2">
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
                : `${formatCredits(Math.max(0, maxBorrow))} Stablecoin`
            }
            loading={isLoading}
          />
        </div>
      </div>

      {/* Protocol Overview */}
      <div>
        <h2 className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">
          Protocol Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Value Locked"
            value={stats ? `$${formatCredits(stats.totalCollateral)}` : '—'}
            loading={statsLoading}
          />
          <StatCard
            label="Total Borrowed"
            value={stats ? `$${formatCredits(stats.totalBorrowed)}` : '—'}
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
        <h2 className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">
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
                  className="block p-5 rounded-card glass-panel-sm hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <h3 className="font-headline text-base text-text-primary mb-1">
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
