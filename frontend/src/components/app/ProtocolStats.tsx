import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useProtocolStats } from '@/hooks/useProtocolStats';
import { useMarketPrice } from '@/hooks/useMarketPrice';
import { useTransaction } from '@/hooks/useTransaction';
import { useAppStore } from '@/stores/appStore';
import { formatCredits } from '@/utils/formatting';
import { PRECISION, USDCX_PROGRAM, USAD_PROGRAM, CREDITS_PROGRAM, ALEO_TESTNET_API, PROTOCOL_ADDRESS, CREDITS_PROTOCOL_ADDRESS, ADMIN_ADDRESS, BACKEND_API } from '@/utils/constants';
import { StatCard } from '@/components/shared/StatCard';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { PrivacyBadge } from '@/components/shared/PrivacyBadge';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { CheckIcon } from '@/components/icons/CheckIcon';
import toast from 'react-hot-toast';

interface ProtocolStatsProps {
  wallet?: {
    requestTransaction?: (transaction: any) => Promise<{ transactionId: string } | undefined>;
    transactionStatus?: (txId: string) => Promise<{ status: string }>;
    decrypt?: (cipherText: string) => Promise<string>;
    connected: boolean;
    address?: string | null;
  };
}

export function ProtocolStats({ wallet }: ProtocolStatsProps) {
  const { data: stats, isLoading } = useProtocolStats();
  const [fundAmount, setFundAmount] = useState('10');
  const [fundToken, setFundToken] = useState<'USDCx' | 'USAD' | 'ALEO'>('USDCx');
  const [usdcxLiquidity, setUsdcxLiquidity] = useState<number | null>(null);
  const [usadLiquidity, setUsadLiquidity] = useState<number | null>(null);
  const [aleoLiquidity, setAleoLiquidity] = useState<number | null>(null);
  const { transactionStep, transactionId, transactionPending } = useAppStore();

  const { price: livePrice, loading: priceLoading, refresh: refreshPrice } = useMarketPrice();
  const walletForTx = wallet || { connected: false };
  const { fundProtocol, fundProtocolUsad, fundProtocolAleo, updateOraclePrice, setRateParams, emergencyPause, resumeProtocol, accrueInterest, resetTransaction } = useTransaction(walletForTx);

  // Oracle health state
  const [oracleHealth, setOracleHealth] = useState<{
    confidence: string | null;
    sourceCount: number;
    failedSources: string[];
    sources: Array<{ source: string; price: number }>;
    currentRound: number;
    onChainRound: number;
    medianPrice?: number;
  } | null>(null);

  const [autoUpdate, setAutoUpdate] = useState(false);
  const [baseRate, setBaseRate] = useState('200');
  const [slopeRate, setSlopeRate] = useState('400');

  const fetchOracleHealth = async () => {
    try {
      const res = await fetch(`${BACKEND_API}/oracle/status`);
      if (res.ok) {
        const data = await res.json();
        setOracleHealth(data);
      }
    } catch {
      // Backend may not be running
    }
  };

  // Fetch protocol liquidity for all 3 tokens
  const fetchLiquidity = async () => {
    // USDCx balance
    try {
      const res = await fetch(
        `${ALEO_TESTNET_API}/program/${USDCX_PROGRAM}/mapping/balances/${PROTOCOL_ADDRESS}`,
      );
      if (res.ok) {
        const raw = await res.text();
        const val = parseInt(raw.replace(/"/g, ''), 10) || 0;
        setUsdcxLiquidity(val);
      } else {
        setUsdcxLiquidity(0);
      }
    } catch {
      setUsdcxLiquidity(0);
    }
    // USAD balance
    try {
      const res = await fetch(
        `${ALEO_TESTNET_API}/program/${USAD_PROGRAM}/mapping/balances/${PROTOCOL_ADDRESS}`,
      );
      if (res.ok) {
        const raw = await res.text();
        const val = parseInt(raw.replace(/"/g, ''), 10) || 0;
        setUsadLiquidity(val);
      } else {
        setUsadLiquidity(0);
      }
    } catch {
      setUsadLiquidity(0);
    }
    // ALEO credits balance (at credits contract address)
    try {
      const res = await fetch(
        `${ALEO_TESTNET_API}/program/${CREDITS_PROGRAM}/mapping/account/${CREDITS_PROTOCOL_ADDRESS}`,
      );
      if (res.ok) {
        const raw = await res.text();
        const val = parseInt(raw.replace(/"/g, ''), 10) || 0;
        setAleoLiquidity(val);
      } else {
        setAleoLiquidity(0);
      }
    } catch {
      setAleoLiquidity(0);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchLiquidity();
    fetchOracleHealth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto oracle update: when admin has toggle on, periodically check and trigger update
  useEffect(() => {
    if (!autoUpdate || !wallet?.connected || wallet?.address !== ADMIN_ADDRESS) return;
    if (transactionPending) return;

    const interval = setInterval(async () => {
      if (transactionPending) return;
      await fetchOracleHealth();
      // Use the backend aggregated median price
      const medianPrice = oracleHealth?.medianPrice;
      if (!medianPrice || medianPrice <= 0) return;

      const onChainPrice = stats?.oraclePrice ?? 0;
      const medianMicro = Math.round(medianPrice * PRECISION);

      // Check if price deviation exceeds 0.5%
      if (onChainPrice > 0) {
        const deviation = Math.abs(medianMicro - onChainPrice) / onChainPrice;
        if (deviation < 0.005) return;
      }

      const currentRound = oracleHealth?.onChainRound ?? 0;
      const nextRound = currentRound + 1;
      toast('Auto-updating oracle price...', { icon: '🔄' });
      await updateOraclePrice(medianMicro, nextRound, 0);
    }, 120_000); // Check every 2 minutes

    return () => clearInterval(interval);
  }, [autoUpdate, wallet?.connected, wallet?.address, transactionPending]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <h2 className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">
          Protocol Statistics
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Value Locked"
            value={stats ? `$${(stats.totalCollateral / PRECISION).toFixed(2)}` : '—'}
            loading={isLoading}
          />
          <StatCard
            label="Total Borrowed"
            value={stats ? `$${(stats.totalBorrowed / PRECISION).toFixed(2)}` : '—'}
            loading={isLoading}
          />
          <StatCard
            label="Active Loans"
            value={stats ? String(stats.loanCount) : '—'}
            loading={isLoading}
          />
          <StatCard
            label="Market Price"
            value={
              priceLoading ? '...' : livePrice ? `$${livePrice.toFixed(4)}` : '—'
            }
            loading={false}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 20 }}
      >
        <h2 className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">
          Utilization
        </h2>
        <div className="grid grid-cols-3 gap-4">
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
                ? `$${(Math.max(0, stats.totalCollateral - stats.totalBorrowed) / PRECISION).toFixed(2)}`
                : '—'
            }
            loading={isLoading}
          />
          <StatCard
            label="Oracle Price (On-Chain)"
            value={
              stats?.oraclePrice
                ? `$${(stats.oraclePrice / PRECISION).toFixed(4)}`
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
        className="rounded-xl glass-panel p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldIcon size={20} className="text-primary" />
            <h3 className="font-headline text-lg text-text-primary">
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
          <div className="p-4 rounded-lg bg-white/[0.03]">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
              Total Collateral
            </p>
            <p className="font-mono text-sm text-text-primary tabular-nums">
              {stats ? `$${(stats.totalCollateral / PRECISION).toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-white/[0.03]">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
              Total Debt
            </p>
            <p className="font-mono text-sm text-text-primary tabular-nums">
              {stats ? `$${(stats.totalBorrowed / PRECISION).toFixed(2)}` : '—'}
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

      {/* Update Oracle Price — Admin Only */}
      {wallet?.connected && wallet?.address === ADMIN_ADDRESS && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 20 }}
          className="rounded-xl glass-panel p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldIcon size={20} className="text-primary" />
            <h3 className="font-headline text-lg text-text-primary">
              Update Oracle Price
            </h3>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            Fetch real ALEO/USD price from multiple sources and update the on-chain oracle.
            This calls <code className="text-primary text-xs">update_oracle_price</code> on the contract.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-white/[0.03]">
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
                Current On-Chain Price
              </p>
              <p className="font-mono text-sm text-text-primary tabular-nums">
                {stats?.oraclePrice ? `$${(stats.oraclePrice / PRECISION).toFixed(6)}` : '—'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/[0.03]">
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
                Live Market Price
              </p>
              <p className="font-mono text-sm text-text-primary tabular-nums">
                {priceLoading ? 'Fetching...' : livePrice ? `$${livePrice.toFixed(6)}` : '—'}
              </p>
            </div>
          </div>

          {/* Oracle Health Info */}
          {oracleHealth && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Confidence</p>
                <p className={`font-mono text-xs font-medium ${
                  oracleHealth.confidence === 'high' ? 'text-accent-success' :
                  oracleHealth.confidence === 'medium' ? 'text-accent-warning' :
                  'text-accent-danger'
                }`}>
                  {oracleHealth.confidence ?? 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Sources</p>
                <p className="font-mono text-xs text-text-primary">
                  {oracleHealth.sourceCount} active
                  {oracleHealth.failedSources.length > 0 && (
                    <span className="text-accent-danger"> / {oracleHealth.failedSources.length} failed</span>
                  )}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03]">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Round</p>
                <p className="font-mono text-xs text-text-primary">
                  #{oracleHealth.onChainRound || oracleHealth.currentRound || 0}
                </p>
              </div>
            </div>
          )}

          {transactionPending && (
            <div className="mb-4">
              <TransactionFlow currentStep={transactionStep} txId={transactionId} />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setAutoUpdate((v) => !v)}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                autoUpdate
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-white/[0.03] border-white/[0.06] text-text-secondary hover:text-text-primary'
              }`}
            >
              {autoUpdate ? '⏸ Auto On' : '▶ Auto Off'}
            </button>
            <button
              onClick={refreshPrice}
              disabled={priceLoading}
              className="px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-text-secondary text-sm hover:text-text-primary transition-colors disabled:opacity-40"
            >
              {priceLoading ? 'Fetching...' : 'Refresh Price'}
            </button>
            <button
              onClick={async () => {
                const priceToUse = livePrice || oracleHealth?.medianPrice;
                if (!priceToUse) {
                  toast.error('Fetch live price first');
                  return;
                }
                // Fetch latest oracle health to get the current round
                await fetchOracleHealth();
                const currentRound = oracleHealth?.onChainRound || oracleHealth?.currentRound || 0;
                const nextRound = currentRound + 1;
                const priceMicro = Math.round(priceToUse * PRECISION);
                await updateOraclePrice(priceMicro, nextRound, 0);
              }}
              disabled={transactionPending || (!livePrice && !oracleHealth?.medianPrice)}
              className="flex-1 py-3 rounded-lg btn-signature font-label uppercase tracking-[0.1em] text-sm disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
            >
              {transactionPending ? 'Processing...' : (livePrice || oracleHealth?.medianPrice) ? `Update to $${(livePrice || oracleHealth?.medianPrice || 0).toFixed(6)}` : 'Fetch price first'}
            </button>
          </div>

          {transactionStep === 'confirmed' && (
            <button
              onClick={resetTransaction}
              className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Done
            </button>
          )}
        </motion.div>
      )}

      {/* Fund Protocol with USDCx — Admin Only */}
      {wallet?.connected && wallet?.address === ADMIN_ADDRESS && (
        <>
        {/* Admin Controls — set_rate_params, emergency_pause, resume_protocol, accrue_interest */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 120, damping: 20 }}
          className="rounded-xl glass-panel p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldIcon size={20} className="text-primary" />
            <h3 className="font-headline text-lg text-text-primary">
              Admin Controls
            </h3>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            Protocol governance transitions: configure interest rates, manage circuit breaker, and trigger interest accrual.
          </p>

          {/* Interest Rate Configuration */}
          <div className="mb-4">
            <label className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] block mb-2">
              Interest Rate Model (BPS)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Base Rate</label>
                <input
                  type="number"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  placeholder="200"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-text-primary font-mono text-sm tabular-nums placeholder:text-text-muted focus:outline-none focus:border-primary/30"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Slope</label>
                <input
                  type="number"
                  value={slopeRate}
                  onChange={(e) => setSlopeRate(e.target.value)}
                  placeholder="400"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-text-primary font-mono text-sm tabular-nums placeholder:text-text-muted focus:outline-none focus:border-primary/30"
                />
              </div>
            </div>
            <button
              onClick={async () => {
                const base = parseInt(baseRate, 10);
                const slope = parseInt(slopeRate, 10);
                if (isNaN(base) || isNaN(slope) || base < 0 || slope < 0) {
                  toast.error('Enter valid BPS values');
                  return;
                }
                await setRateParams(base, slope);
              }}
              disabled={transactionPending}
              className="w-full mt-3 py-2.5 rounded-lg btn-signature font-label uppercase tracking-[0.1em] text-xs disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
            >
              {transactionPending ? 'Processing...' : 'Set Rate Params'}
            </button>
          </div>

          {/* Circuit Breaker & Interest Accrual */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => emergencyPause()}
              disabled={transactionPending}
              className="py-3 rounded-lg bg-accent-danger/10 border border-accent-danger/20 text-accent-danger text-xs font-label uppercase tracking-[0.1em] hover:bg-accent-danger/20 transition-colors disabled:opacity-40"
            >
              Emergency Pause
            </button>
            <button
              onClick={() => resumeProtocol()}
              disabled={transactionPending}
              className="py-3 rounded-lg bg-accent-success/10 border border-accent-success/20 text-accent-success text-xs font-label uppercase tracking-[0.1em] hover:bg-accent-success/20 transition-colors disabled:opacity-40"
            >
              Resume Protocol
            </button>
            <button
              onClick={() => accrueInterest()}
              disabled={transactionPending}
              className="py-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-label uppercase tracking-[0.1em] hover:bg-primary/20 transition-colors disabled:opacity-40"
            >
              Accrue Interest
            </button>
          </div>

          {transactionStep === 'confirmed' && (
            <button
              onClick={resetTransaction}
              className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Done
            </button>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 20 }}
          className="rounded-xl glass-panel p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldIcon size={20} className="text-primary" />
            <h3 className="font-headline text-lg text-text-primary">
              Fund Protocol Liquidity
            </h3>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            Transfer tokens to the lending protocol so borrowers can take loans.
            Calls <code className="text-primary text-xs">transfer_public</code> on the respective token contract.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-white/[0.03]">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">USDCx</p>
              <p className="font-mono text-sm text-text-primary tabular-nums">
                {usdcxLiquidity !== null ? formatCredits(usdcxLiquidity) : '—'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03]">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">USAD</p>
              <p className="font-mono text-sm text-text-primary tabular-nums">
                {usadLiquidity !== null ? formatCredits(usadLiquidity) : '—'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03]">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">ALEO</p>
              <p className="font-mono text-sm text-text-primary tabular-nums">
                {aleoLiquidity !== null ? formatCredits(aleoLiquidity) : '—'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.03] mb-2">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Main Protocol Address (USDCx/USAD)</p>
            <p className="font-mono text-[10px] text-text-secondary break-all">{PROTOCOL_ADDRESS}</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03] mb-4">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Credits Protocol Address (ALEO)</p>
            <p className="font-mono text-[10px] text-text-secondary break-all">{CREDITS_PROTOCOL_ADDRESS}</p>
          </div>

          {/* Token selector */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(['USDCx', 'USAD', 'ALEO'] as const).map((token) => (
              <button
                key={token}
                onClick={() => setFundToken(token)}
                className={`py-2 rounded-lg text-xs font-label uppercase tracking-[0.1em] transition-all ${
                  fundToken === token
                    ? 'bg-primary/20 border border-primary/40 text-primary'
                    : 'bg-white/[0.03] border border-white/[0.06] text-text-secondary hover:border-white/10'
                }`}
              >
                {token}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <input
              type="number"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              placeholder={`Amount ${fundToken}`}
              min="1"
              step="1"
              className="flex-1 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-text-primary font-mono text-sm tabular-nums placeholder:text-text-muted focus:outline-none focus:border-primary/30"
              aria-label={`${fundToken} amount to fund`}
            />
            <span className="text-sm text-text-secondary">{fundToken}</span>
          </div>

          {transactionPending && (
            <div className="mb-4">
              <TransactionFlow currentStep={transactionStep} txId={transactionId} />
            </div>
          )}

          <button
            onClick={async () => {
              const amt = parseFloat(fundAmount || '0');
              if (amt <= 0) {
                toast.error('Enter a valid amount');
                return;
              }
              const microAmount = Math.floor(amt * 1_000_000);
              if (fundToken === 'USDCx') {
                await fundProtocol(microAmount);
              } else if (fundToken === 'USAD') {
                await fundProtocolUsad(microAmount);
              } else {
                await fundProtocolAleo(microAmount);
              }
              setTimeout(fetchLiquidity, 3000);
            }}
            disabled={transactionPending}
            className="w-full py-3 rounded-lg btn-signature font-label uppercase tracking-[0.1em] text-sm disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
          >
            {transactionPending ? 'Processing...' : `Fund ${fundAmount || '0'} ${fundToken} to Protocol`}
          </button>

          {transactionStep === 'confirmed' && (
            <button
              onClick={() => {
                resetTransaction();
                fetchLiquidity();
              }}
              className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Done
            </button>
          )}
        </motion.div>
        </>
      )}

      {/* New Contract Programs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 120, damping: 20 }}
      >
        <h2 className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">
          Advanced Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl glass-panel p-5">
            <h3 className="font-headline text-sm text-primary mb-2">Dark Pool</h3>
            <p className="text-xs text-text-muted mb-3">Epoch-based private batch trading at oracle mid-price</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-text-secondary"><span>Transitions</span><span>9</span></div>
              <div className="flex justify-between text-text-secondary"><span>Privacy</span><span className="text-accent-success">Full</span></div>
              <div className="flex justify-between text-text-secondary"><span>Program</span><span className="font-mono text-[10px]">dara_dark_pool_v1</span></div>
            </div>
          </div>
          <div className="rounded-xl glass-panel p-5">
            <h3 className="font-headline text-sm text-primary mb-2">Sealed-Bid Auctions</h3>
            <p className="text-xs text-text-muted mb-3">Anti-MEV liquidation auctions with commitment scheme</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-text-secondary"><span>Transitions</span><span>10</span></div>
              <div className="flex justify-between text-text-secondary"><span>Privacy</span><span className="text-accent-success">Full</span></div>
              <div className="flex justify-between text-text-secondary"><span>Program</span><span className="font-mono text-[10px]">dara_auction_v1</span></div>
            </div>
          </div>
          <div className="rounded-xl glass-panel p-5">
            <h3 className="font-headline text-sm text-primary mb-2">Flash Loans</h3>
            <p className="text-xs text-text-muted mb-3">Instant collateral-backed flash lending at 0.09% fee</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-text-secondary"><span>Transitions</span><span>11</span></div>
              <div className="flex justify-between text-text-secondary"><span>Privacy</span><span className="text-accent-success">Full</span></div>
              <div className="flex justify-between text-text-secondary"><span>Program</span><span className="font-mono text-[10px]">dara_flash_v1</span></div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
