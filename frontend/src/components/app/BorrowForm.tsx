import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { useOraclePrice } from '@/hooks/useProtocolStats';
import { useAleoClient } from '@/hooks/useAleoClient';
import { useMarketPrice } from '@/hooks/useMarketPrice';
import { useAppStore } from '@/stores/appStore';
import { formatCredits, calculateHealthFactor, calculateLiquidationPrice, calculateMaxBorrow } from '@/utils/formatting';
import { PRECISION, ADMIN_ADDRESS, MAPPINGS } from '@/utils/constants';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { HealthFactorGauge } from '@/components/shared/HealthFactorGauge';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ArrowDownIcon } from '@/components/icons/ArrowDownIcon';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { LockIcon } from '@/components/icons/LockIcon';
import toast from 'react-hot-toast';

interface BorrowFormProps {
  wallet: {
    requestRecords?: (program: string) => Promise<unknown[]>;
    requestTransaction?: (transaction: any) => Promise<{ transactionId: string } | undefined>;
    transactionStatus?: (txId: string) => Promise<{ status: string }>;
    decrypt?: (cipherText: string) => Promise<string>;
    connected: boolean;
    address?: string | null;
  };
}

export function BorrowForm({ wallet }: BorrowFormProps) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [selectedCollateralIdx, setSelectedCollateralIdx] = useState(0);

  const { transactionStep, transactionId, transactionPending } = useAppStore();
  const { borrow, updateOraclePrice, resetTransaction } = useTransaction(wallet);
  const { collateralReceipts, isLoading, refetch } = useWalletRecords(wallet);
  const { data: oraclePrice } = useOraclePrice();
  const { getMappingValue, getLatestBlockHeight } = useAleoClient();
  const { price: livePrice } = useMarketPrice();

  const [priceStale, setPriceStale] = useState<boolean | null>(null);
  const [priceAge, setPriceAge] = useState<number | null>(null);
  const MAX_PRICE_AGE = 100;

  // Check oracle price freshness
  useEffect(() => {
    let cancelled = false;
    async function checkFreshness() {
      try {
        const [updateBlockRaw, currentHeight] = await Promise.all([
          getMappingValue(MAPPINGS.PRICE_UPDATE_BLOCK),
          getLatestBlockHeight(),
        ]);
        if (cancelled) return;
        const updateBlock = parseInt(updateBlockRaw?.replace(/u32|"/g, '') || '0', 10);
        if (currentHeight && updateBlock > 0) {
          const age = currentHeight - updateBlock;
          setPriceAge(age);
          setPriceStale(age > MAX_PRICE_AGE);
        } else {
          setPriceStale(true);
          setPriceAge(null);
        }
      } catch {
        setPriceStale(null);
      }
    }
    checkFreshness();
    const interval = setInterval(checkFreshness, 15_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [getMappingValue, getLatestBlockHeight]);

  const selectedCollateral = collateralReceipts[selectedCollateralIdx];
  const collateralAmount = selectedCollateral?.collateralAmount || 0;
  const currentOraclePrice = oraclePrice || PRECISION;
  const maxBorrowAmount = calculateMaxBorrow(collateralAmount, currentOraclePrice);
  const borrowAmount = Math.floor(parseFloat(amount || '0') * 1_000_000);
  const colValue = (collateralAmount * currentOraclePrice) / PRECISION;
  const ltvRatio = colValue > 0 ? (borrowAmount / colValue) * 100 : 0;
  const projectedHealth = borrowAmount > 0
    ? calculateHealthFactor(collateralAmount, borrowAmount, oraclePrice || PRECISION)
    : Infinity;
  const liquidationPrice = borrowAmount > 0
    ? calculateLiquidationPrice(borrowAmount, collateralAmount)
    : 0;

  const sliderPercent = useMemo(() => {
    if (maxBorrowAmount <= 0) return 0;
    return Math.min((borrowAmount / maxBorrowAmount) * 100, 100);
  }, [borrowAmount, maxBorrowAmount]);

  if (!wallet.connected) {
    return (
      <EmptyState
        title="Connect Wallet"
        description="Connect your Shield Wallet to borrow against your collateral."
        action={{ label: 'Go Back', onClick: () => navigate('/app') }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-[480px] mx-auto">
        <LoadingSkeleton height={400} rounded="rounded-xl" />
      </div>
    );
  }

  if (collateralReceipts.length === 0) {
    return (
      <EmptyState
        title="No Collateral Found"
        description="You need to supply collateral before you can borrow. Deposit ALEO to get started."
        action={{ label: 'Supply Collateral', onClick: () => navigate('/app/supply') }}
      />
    );
  }

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = parseInt(e.target.value, 10);
    const newAmount = Math.floor((maxBorrowAmount * pct) / 100);
    setAmount((newAmount / 1_000_000).toFixed(6));
  };

  const handleSubmit = async () => {
    if (borrowAmount <= 0 || borrowAmount > maxBorrowAmount) {
      toast.error('Invalid borrow amount');
      return;
    }

    if (!oraclePrice) {
      toast.error('Oracle price unavailable');
      return;
    }

    if (priceStale) {
      toast.error('Oracle price is stale (>100 blocks old). Update oracle first, then borrow within 5 minutes.');
      return;
    }

    const orchestratorAddress = wallet.address || '';
    const collateralRecord = selectedCollateral?.plaintext || '';

    try {
      const txId = await borrow(collateralRecord, borrowAmount, oraclePrice, orchestratorAddress);
      if (txId) {
        setTimeout(() => refetch(), 3000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Borrow failed';
      toast.error(message);
    }
  };

  const handleUpdateOracle = async () => {
    if (!livePrice || !oraclePrice) return;
    try {
      const roundRaw = await getMappingValue(MAPPINGS.PRICE_ROUND);
      const currentRound = parseInt(roundRaw?.replace(/u64|"/g, '') || '0', 10);
      const priceMicro = Math.round(livePrice * PRECISION);
      toast('Updating oracle price via wallet...', { icon: '🔄' });
      await updateOraclePrice(priceMicro, currentRound + 1);
    } catch (err) {
      toast.error('Oracle update failed');
    }
  };

  return (
    <div className="max-w-[480px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="rounded-xl bg-bg-tertiary border border-border-default p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <ArrowDownIcon size={16} className="text-accent" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              Borrow
            </h2>
            <p className="text-xs text-text-secondary">
              Borrow USDCx against your encrypted ALEO collateral
            </p>
          </div>
        </div>

        {/* Asset */}
        <div className="mb-4">
          <label className="text-label uppercase text-text-muted tracking-widest block mb-2">
            Borrow Asset
          </label>
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-bg-secondary border border-border-default">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-blue-400">U</span>
            </div>
            <span className="text-sm font-medium text-text-primary">USDCx Stablecoin</span>
          </div>
        </div>

        {/* Collateral Selector */}
        {collateralReceipts.length > 1 && (
          <div className="mb-4">
            <label className="text-label uppercase text-text-muted tracking-widest block mb-2">
              Select Collateral
            </label>
            <select
              value={selectedCollateralIdx}
              onChange={(e) => setSelectedCollateralIdx(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-lg bg-bg-secondary border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent/30"
              aria-label="Select collateral receipt"
            >
              {collateralReceipts.map((r, idx) => (
                <option key={idx} value={idx}>
                  {formatCredits(r.collateralAmount)} ALEO
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-bg-secondary">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
              Collateral
            </p>
            <p className="font-mono text-sm text-text-primary tabular-nums">
              {formatCredits(collateralAmount)} ALEO
            </p>
          </div>
          <div className="p-3 rounded-lg bg-bg-secondary">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
              Max Borrow
            </p>
            <p className="font-mono text-sm text-text-primary tabular-nums">
              {formatCredits(maxBorrowAmount)} USDCx
            </p>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="text-label uppercase text-text-muted tracking-widest block mb-2">
            Borrow Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full px-4 py-4 rounded-lg bg-bg-secondary border border-border-default text-text-primary font-mono text-xl tabular-nums placeholder:text-text-muted focus:outline-none focus:border-accent/30 transition-colors"
            aria-label="Borrow amount in USDCx"
          />

          {/* Slider */}
          <div className="mt-3">
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(sliderPercent)}
              onChange={handleSlider}
              className="w-full accent-accent h-1"
              aria-label="Borrow percentage of max"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[11px] text-text-muted">0%</span>
              <span className="text-[11px] text-text-secondary">{ltvRatio.toFixed(1)}% LTV</span>
              <span className="text-[11px] text-text-muted">70%</span>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between py-2 px-3 rounded-lg bg-bg-secondary">
            <span className="text-xs text-text-secondary">LTV Ratio</span>
            <span className={`font-mono text-xs tabular-nums ${ltvRatio > 65 ? 'text-accent-warning' : 'text-text-primary'}`}>
              {ltvRatio.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-bg-secondary">
            <span className="text-xs text-text-secondary">Health Factor</span>
            <HealthFactorGauge value={projectedHealth} size={60} />
          </div>
          <div className="flex justify-between py-2 px-3 rounded-lg bg-bg-secondary">
            <span className="text-xs text-text-secondary">Liquidation Price</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-text-primary tabular-nums">
                {liquidationPrice > 0 ? `${(liquidationPrice / PRECISION).toFixed(4)}` : '—'}
              </span>
              <LockIcon size={10} className="text-accent" />
            </div>
          </div>
        </div>

        {/* Encrypted callout */}
        <div className="mb-6 p-3 rounded-lg bg-accent/5 border border-accent/10">
          <div className="flex items-start gap-2">
            <ShieldIcon size={14} className="text-accent mt-0.5 flex-shrink-0" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Your liquidation price will be <strong className="text-accent">ENCRYPTED</strong> on-chain.
              MEV bots cannot see it.
            </p>
          </div>
        </div>

        {/* Transaction Flow */}
        {transactionPending && (
          <div className="mb-6">
            <TransactionFlow currentStep={transactionStep} txId={transactionId} />
          </div>
        )}

        {/* Oracle Freshness Warning */}
        {priceStale && (
          <div className="mb-4 p-4 rounded-lg bg-accent-danger/10 border border-accent-danger/30">
            <p className="text-sm text-accent-danger font-medium mb-2">
              Oracle price is stale ({priceAge !== null ? `${priceAge} blocks old` : 'unknown age'} — max {MAX_PRICE_AGE})
            </p>
            <p className="text-xs text-text-secondary mb-3">
              The on-chain oracle must be updated within 100 blocks (~5 min) before borrowing.
            </p>
            {wallet.address === ADMIN_ADDRESS && (
              <button
                onClick={handleUpdateOracle}
                disabled={transactionPending || !livePrice}
                className="px-4 py-2 rounded-lg bg-accent text-bg-primary text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-40"
              >
                {transactionPending ? 'Updating...' : `Update Oracle to $${livePrice?.toFixed(4) || '...'}`}
              </button>
            )}
          </div>
        )}

        {priceStale === false && priceAge !== null && (
          <div className="mb-4 flex items-center gap-2 text-xs text-accent-success">
            <span>Oracle fresh ({priceAge} blocks ago)</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={borrowAmount <= 0 || borrowAmount > maxBorrowAmount || transactionPending || priceStale === true}
          className="w-full py-4 rounded-lg bg-accent text-bg-primary font-medium text-[15px] hover:bg-accent-hover transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
        >
          {transactionPending ? 'Processing...' : priceStale ? 'Update Oracle First' : 'Borrow'}
        </button>

        {transactionStep === 'confirmed' && (
          <button
            onClick={resetTransaction}
            className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            New Borrow
          </button>
        )}
      </motion.div>
    </div>
  );
}
