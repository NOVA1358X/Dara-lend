import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useProtocolStats } from '@/hooks/useProtocolStats';
import { useMarketPrice } from '@/hooks/useMarketPrice';
import { useVaultStats, useMultiAssetPrices } from '@/hooks/useVaultStats';
import { formatCredits } from '@/utils/formatting';
import { PRECISION, BACKEND_API, TOKEN_TYPES } from '@/utils/constants';
import { StatCard } from '@/components/shared/StatCard';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { ChartIcon } from '@/components/icons/ChartIcon';

interface DataPoint {
  timestamp: number;
  value: number;
}

interface InterestRates {
  rateBaseBps: number;
  rateSlopeBps: number;
  supplyApyBps: number;
  borrowApyBps: number;
}

export function Analytics() {
  const { data: stats, isLoading } = useProtocolStats();
  const { price: livePrice } = useMarketPrice();
  const { data: vaultStats, isLoading: vaultLoading } = useVaultStats();
  const { data: multiPrices } = useMultiAssetPrices();
  const [tvlHistory, setTvlHistory] = useState<DataPoint[]>([]);
  const [priceHistory, setPriceHistory] = useState<DataPoint[]>([]);
  const [rates, setRates] = useState<InterestRates | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const [tvlRes, priceRes, ratesRes] = await Promise.all([
          fetch(`${BACKEND_API}/analytics/tvl`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${BACKEND_API}/analytics/price-history`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${BACKEND_API}/analytics/interest-rates`).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (tvlRes?.history) setTvlHistory(tvlRes.history);
        if (priceRes?.history) setPriceHistory(priceRes.history);
        if (ratesRes) setRates(ratesRes);
      } catch {
        // Backend may not be running
      }
    }
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60_000);
    return () => clearInterval(interval);
  }, []);

  const collateralValueUsd =
    stats ? stats.totalCollateral / PRECISION : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ChartIcon size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="font-headline text-2xl text-text-primary">Analytics</h1>
          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-text-muted">
            Protocol Metrics & Performance
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      >
        <h2 className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">
          Key Metrics
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="TVL (ALEO)"
            value={stats ? `${formatCredits(stats.totalCollateralAleo)}` : '—'}
            loading={isLoading}
          />
          <StatCard
            label="TVL (USD)"
            value={collateralValueUsd > 0 ? `$${collateralValueUsd.toFixed(2)}` : '—'}
            loading={isLoading}
          />
          <StatCard
            label="Total Borrowed"
            value={stats ? `$${(stats.totalBorrowed / PRECISION).toFixed(2)}` : '—'}
            loading={isLoading}
          />
          <StatCard
            label="Utilization"
            value={stats ? `${(stats.utilizationRate * 100).toFixed(1)}%` : '—'}
            loading={isLoading}
          />
        </div>
      </motion.div>

      {/* Interest Rate Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl glass-panel p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-lg">trending_up</span>
          <h3 className="font-headline text-base text-text-primary">Interest Rate Model</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">
              Base Rate
            </p>
            <p className="font-mono text-lg text-text-primary tabular-nums">
              {rates ? `${(rates.rateBaseBps / 100).toFixed(2)}%` : '—'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">
              Slope
            </p>
            <p className="font-mono text-lg text-text-primary tabular-nums">
              {rates ? `${(rates.rateSlopeBps / 100).toFixed(2)}%` : '—'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">
              Supply APY
            </p>
            <p className="font-mono text-lg text-accent-success tabular-nums">
              {rates ? `${(rates.supplyApyBps / 100).toFixed(2)}%` : '—'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">
              Borrow APY
            </p>
            <p className="font-mono text-lg text-secondary tabular-nums">
              {rates ? `${(rates.borrowApyBps / 100).toFixed(2)}%` : '—'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Collateral Composition */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl glass-panel p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-lg">pie_chart</span>
          <h3 className="font-headline text-base text-text-primary">Multi-Collateral Composition</h3>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <CompositionCard
            token="ALEO"
            label="Aleo Credits"
            color="#C9DDFF"
            description="Native privacy-preserving collateral"
            amount={stats ? formatCredits(stats.totalCollateralAleo) : '0.00'}
          />
          <CompositionCard
            token="USDCx"
            label="USDCx Stablecoin"
            color="#D6C5A1"
            description="Privacy-wrapped USDC"
            amount={stats ? formatCredits(stats.totalCollateralUsdcx) : '0.00'}
          />
          <CompositionCard
            token="USAD"
            label="USAD Stablecoin"
            color="#34D399"
            description="Aleo-native stablecoin"
            amount={stats ? formatCredits(stats.totalCollateralUsad) : '0.00'}
          />
        </div>
      </motion.div>

      {/* Price History Chart (text-based) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl glass-panel p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">show_chart</span>
            <h3 className="font-headline text-base text-text-primary">Oracle Price Feed</h3>
          </div>
          <span className="font-mono text-sm text-primary tabular-nums">
            {livePrice ? `$${livePrice.toFixed(4)}` : '—'}
          </span>
        </div>

        {priceHistory.length > 0 ? (
          <div className="space-y-1">
            {priceHistory.slice(-12).map((point, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-1.5 px-3 rounded bg-white/[0.02]"
              >
                <span className="text-xs text-text-muted">
                  {new Date(point.timestamp).toLocaleTimeString()}
                </span>
                <span className="font-mono text-xs text-text-primary tabular-nums">
                  ${(point.value / PRECISION).toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted py-8 text-center">
            Price history will populate when the backend is running.
          </p>
        )}
      </motion.div>

      {/* Multi-Asset Oracle Prices */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl glass-panel p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">currency_exchange</span>
            <h3 className="font-headline text-base text-text-primary">Oracle Prices</h3>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { token: 'ALEO', price: multiPrices?.aleo, color: '#C9DDFF' },
            { token: 'USDCx', price: multiPrices?.usdcx, color: '#D6C5A1' },
            { token: 'USAD', price: multiPrices?.usad, color: '#34D399' },
          ].map(({ token, price, color }) => (
            <div key={token} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-label text-[10px] uppercase tracking-[0.1em] text-text-primary">{token}</span>
              </div>
              <p className="font-mono text-lg text-text-primary tabular-nums">
                {price != null && price > 0 ? `$${price.toFixed(4)}` : '—'}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Yield Vault Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl glass-panel p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-lg">savings</span>
          <h3 className="font-headline text-base text-text-primary">Yield Vault</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">USDCx Pool</p>
            <p className="font-mono text-lg text-text-primary tabular-nums">
              ${formatCredits(vaultStats?.poolTotalUsdcx ?? 0)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">USAD Pool</p>
            <p className="font-mono text-lg text-text-primary tabular-nums">
              ${formatCredits(vaultStats?.poolTotalUsad ?? 0)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">USDCx Share Price</p>
            <p className="font-mono text-lg text-accent-success tabular-nums">
              {(vaultStats?.sharePriceUsdcx ?? 1).toFixed(4)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">USAD Share Price</p>
            <p className="font-mono text-lg text-accent-success tabular-nums">
              {(vaultStats?.sharePriceUsad ?? 1).toFixed(4)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">Private Transfers</p>
            <p className="font-mono text-base text-text-primary">{vaultStats?.transferCount ?? 0}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">Transfer Volume</p>
            <p className="font-mono text-base text-text-primary">${formatCredits(vaultStats?.totalVolume ?? 0)}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02]">
            <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">Total Deposits</p>
            <p className="font-mono text-base text-text-primary">
              {(vaultStats?.depositCountUsdcx ?? 0) + (vaultStats?.depositCountUsad ?? 0)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Protocol Security */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl glass-panel p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <ShieldIcon size={18} className="text-primary" />
          <h3 className="font-headline text-base text-text-primary">Protocol Security</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SecurityItem icon="lock" label="Records Encrypted" description="All positions stored as private records" />
          <SecurityItem icon="gavel" label="Circuit Breaker" description="Emergency pause/resume by admin" />
          <SecurityItem icon="verified" label="5-Source Oracle" description="Median price from 5 exchanges" />
          <SecurityItem icon="shield" label="Privacy Hardened" description="Version-pinned privacy model" />
          <SecurityItem icon="monitor_heart" label="Liquidation Bot" description="Automated under-collateral detection" />
          <SecurityItem icon="savings" label="Yield Vault" description="Earn yield on stablecoin deposits" />
          <SecurityItem icon="visibility_off" label="Private Transfers" description="ZK-shielded token relay" />
        </div>
      </motion.div>
    </div>
  );
}

function CompositionCard({
  token,
  label,
  color,
  description,
  amount,
}: {
  token: string;
  label: string;
  color: string;
  description: string;
  amount: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-label text-xs uppercase tracking-[0.1em] text-text-primary">
          {token}
        </span>
      </div>
      <p className="font-mono text-lg text-text-primary tabular-nums mb-1">{amount}</p>
      <p className="text-sm text-text-secondary mb-1">{label}</p>
      <p className="text-[11px] text-text-muted">{description}</p>
    </div>
  );
}

function SecurityItem({
  icon,
  label,
  description,
}: {
  icon: string;
  label: string;
  description: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.03]">
      <span className="material-symbols-outlined text-primary text-lg mb-2 block">{icon}</span>
      <p className="font-label text-[10px] uppercase tracking-[0.15em] text-text-primary mb-0.5">
        {label}
      </p>
      <p className="text-[11px] text-text-muted leading-relaxed">{description}</p>
    </div>
  );
}
