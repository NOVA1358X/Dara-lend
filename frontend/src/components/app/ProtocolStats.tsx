import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useProtocolStats } from '@/hooks/useProtocolStats';
import { useMarketPrice } from '@/hooks/useMarketPrice';
import { useTransaction } from '@/hooks/useTransaction';
import { useAppStore } from '@/stores/appStore';
import { formatCredits } from '@/utils/formatting';
import { PRECISION, USDCX_PROGRAM, ALEO_TESTNET_API, PROTOCOL_ADDRESS, ADMIN_ADDRESS } from '@/utils/constants';
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
  const [usdcxLiquidity, setUsdcxLiquidity] = useState<number | null>(null);
  const { transactionStep, transactionId, transactionPending } = useAppStore();

  const { price: livePrice, loading: priceLoading, refresh: refreshPrice } = useMarketPrice();
  const walletForTx = wallet || { connected: false };
  const { fundProtocol, updateOraclePrice, resetTransaction } = useTransaction(walletForTx);

  // Fetch USDCx liquidity of the protocol
  const fetchLiquidity = async () => {
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
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchLiquidity();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        <h2 className="text-label uppercase text-text-muted tracking-widest mb-4">
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
                ? `${formatCredits(Math.max(0, stats.totalCollateral - stats.totalBorrowed))} ALEO`
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

      {/* Update Oracle Price — Admin Only */}
      {wallet?.connected && wallet?.address === ADMIN_ADDRESS && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 20 }}
          className="rounded-xl bg-bg-tertiary border border-border-default p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldIcon size={20} className="text-accent" />
            <h3 className="font-heading text-lg font-semibold text-text-primary">
              Update Oracle Price
            </h3>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            Fetch real ALEO/USD price from CoinGecko and update the on-chain oracle.
            This calls <code className="text-accent text-xs">update_oracle_price</code> on the contract.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-bg-secondary">
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
                Current On-Chain Price
              </p>
              <p className="font-mono text-sm text-text-primary tabular-nums">
                {stats?.oraclePrice ? `$${(stats.oraclePrice / PRECISION).toFixed(6)}` : '—'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-bg-secondary">
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
                Live CoinGecko Price
              </p>
              <p className="font-mono text-sm text-text-primary tabular-nums">
                {priceLoading ? 'Fetching...' : livePrice ? `$${livePrice.toFixed(6)}` : '—'}
              </p>
            </div>
          </div>

          {transactionPending && (
            <div className="mb-4">
              <TransactionFlow currentStep={transactionStep} txId={transactionId} />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={refreshPrice}
              disabled={priceLoading}
              className="px-4 py-3 rounded-lg bg-bg-secondary border border-border-default text-text-secondary text-sm hover:text-text-primary transition-colors disabled:opacity-40"
            >
              {priceLoading ? 'Fetching...' : 'Refresh Price'}
            </button>
            <button
              onClick={async () => {
                if (!livePrice) {
                  toast.error('Fetch live price first');
                  return;
                }
                const priceMicro = Math.round(livePrice * PRECISION);
                await updateOraclePrice(priceMicro);
              }}
              disabled={transactionPending || !livePrice}
              className="flex-1 py-3 rounded-lg bg-accent text-bg-primary font-medium text-sm hover:bg-accent-hover transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
            >
              {transactionPending ? 'Processing...' : livePrice ? `Update to $${livePrice.toFixed(6)}` : 'Fetch price first'}
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 20 }}
          className="rounded-xl bg-bg-tertiary border border-border-default p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldIcon size={20} className="text-accent" />
            <h3 className="font-heading text-lg font-semibold text-text-primary">
              Fund Protocol Liquidity
            </h3>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            Transfer USDCx stablecoin to the lending protocol so borrowers can take loans.
            This calls <code className="text-accent text-xs">transfer_public</code> on the USDCx contract.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-bg-secondary">
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
                Protocol USDCx Balance
              </p>
              <p className="font-mono text-sm text-text-primary tabular-nums">
                {usdcxLiquidity !== null ? `${formatCredits(usdcxLiquidity)} USDCx` : '—'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-bg-secondary">
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-2">
                Protocol Address
              </p>
              <p className="font-mono text-[10px] text-text-secondary break-all">
                {PROTOCOL_ADDRESS}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <input
              type="number"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              placeholder="Amount USDCx"
              min="1"
              step="1"
              className="flex-1 px-4 py-3 rounded-lg bg-bg-secondary border border-border-default text-text-primary font-mono text-sm tabular-nums placeholder:text-text-muted focus:outline-none focus:border-accent/30"
              aria-label="USDCx amount to fund"
            />
            <span className="text-sm text-text-secondary">USDCx</span>
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
              await fundProtocol(microAmount);
              // Refresh liquidity after funding
              setTimeout(fetchLiquidity, 10_000);
            }}
            disabled={transactionPending}
            className="w-full py-3 rounded-lg bg-accent text-bg-primary font-medium text-sm hover:bg-accent-hover transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
          >
            {transactionPending ? 'Processing...' : `Fund ${fundAmount || '0'} USDCx to Protocol`}
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
      )}
    </div>
  );
}
