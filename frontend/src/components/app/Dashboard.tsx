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
import { LinkIcon } from '@/components/icons/LinkIcon';
import { EyeOffIcon } from '@/components/icons/EyeOffIcon';
import { SpotlightCard } from '@/components/shared/SpotlightCard';
import { FadeInView } from '@/components/shared/FadeInView';
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
  {
    label: 'Yield Vault',
    description: 'Earn yield on stablecoin deposits',
    href: '/app/yield',
    icon: LinkIcon,
  },
  {
    label: 'Private Transfer',
    description: 'Send tokens with ZK privacy',
    href: '/app/transfer',
    icon: EyeOffIcon,
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
  const hasOnChainPositions = stats && (stats.loanCount > 0 || stats.totalCollateral > 0);
  const walletRecordsEmpty = collateralReceipts.length === 0 && debtPositions.length === 0;

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
      {/* Wallet Sync Notice */}
      {wallet.connected && !isLoading && walletRecordsEmpty && hasOnChainPositions && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-yellow-300">Wallet Syncing Records</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Your wallet is syncing private records. Position data may be temporarily incomplete.
                Try disconnecting and reconnecting your wallet if this persists.
              </p>
            </div>
          </div>
        </motion.div>
      )}
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
      <FadeInView direction="up" delay={0.1}>
        <h2 className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">
          Your Position
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            <StatCard
              key="collateral"
              label="Your Collateral"
              value={
                !wallet.connected ? '—' : isLoading ? '' : `$${formatCredits(totalCollateralValueUsd)}`
              }
              loading={isLoading}
            />,
            <StatCard
              key="debt"
              label="Your Debt"
              value={
                !wallet.connected ? '—' : isLoading ? '' : `$${formatCredits(totalDebtUsd)}`
              }
              loading={isLoading}
            />,
            <div key="health" className="rounded-card glass-panel-sm p-5">
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
            </div>,
            <StatCard
              key="borrow"
              label="Available to Borrow"
              value={
                !wallet.connected
                  ? '—'
                  : isLoading
                  ? ''
                  : `${formatCredits(Math.max(0, maxBorrow))} Stablecoin`
              }
              loading={isLoading}
            />,
          ].map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {card}
            </motion.div>
          ))}
        </div>
      </FadeInView>

      {/* Protocol Overview */}
      <FadeInView direction="up" delay={0.2}>
        <h2 className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">
          Protocol Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Value Locked', value: stats ? `$${formatCredits(stats.totalCollateral)}` : '—', loading: statsLoading },
            { label: 'Total Borrowed', value: stats ? `$${formatCredits(stats.totalBorrowed)}` : '—', loading: statsLoading },
            { label: 'Active Loans', value: stats ? String(stats.loanCount) : '—', loading: statsLoading },
            { label: 'ALEO Price', value: marketPrice ? `$${marketPrice.toFixed(4)}` : '—', loading: false },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15 + idx * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <StatCard label={stat.label} value={stat.value} loading={stat.loading} />
            </motion.div>
          ))}
        </div>
      </FadeInView>

      {/* Oracle Price Feed */}
      <OracleStatus />

      {/* Quick Actions */}
      <FadeInView direction="up" delay={0.3}>
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
                  delay: 0.3 + idx * 0.08,
                  type: 'spring',
                  stiffness: 120,
                  damping: 20,
                }}
              >
                <SpotlightCard className="h-full">
                  <Link
                    to={action.href}
                    className="block p-5"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3 transition-all duration-300 group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_rgba(201,221,255,0.1)]">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <h3 className="font-headline text-base text-text-primary mb-1">
                      {action.label}
                    </h3>
                    <p className="text-sm text-text-secondary">{action.description}</p>
                  </Link>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>
      </FadeInView>
    </div>
  );
}
