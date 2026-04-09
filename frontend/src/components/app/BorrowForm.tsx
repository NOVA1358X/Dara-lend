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
import { PRECISION, MAPPINGS, CREDITS_MAPPINGS, CREDITS_PROGRAM_ID, TOKEN_LABELS, TOKEN_TYPES } from '@/utils/constants';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { HealthFactorGauge } from '@/components/shared/HealthFactorGauge';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ArrowDownIcon } from '@/components/icons/ArrowDownIcon';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import { LockIcon } from '@/components/icons/LockIcon';
import { TokenIcon } from '@/components/shared/TokenIcon';
import toast from 'react-hot-toast';

type BorrowAsset = 'USDCx' | 'USAD' | 'ALEO';

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
  const [borrowAsset, setBorrowAsset] = useState<BorrowAsset>('USDCx');

  const { transactionStep, transactionId, transactionPending } = useAppStore();
  const { borrow, borrowUsad, borrowCredits, updateOraclePrice, resetTransaction } = useTransaction(wallet);
  const { collateralReceipts, isLoading, refetch } = useWalletRecords(wallet);
  const { data: oraclePrice } = useOraclePrice();
  const { getMappingValue } = useAleoClient();
  const { price: livePrice } = useMarketPrice();

  // Credits contract has its OWN oracle_price mapping — must match exactly on-chain
  const [creditsAleoPrice, setCreditsAleoPrice] = useState<number>(0);
  useEffect(() => {
    let cancelled = false;
    const fetchCreditsOracle = async () => {
      try {
        const raw = await getMappingValue(CREDITS_MAPPINGS.ORACLE_PRICE, '0u8', CREDITS_PROGRAM_ID);
        const price = parseInt((raw || '0').replace(/u64|["']/g, ''), 10);
        if (!cancelled && price > 0) setCreditsAleoPrice(price);
      } catch { /* silent */ }
    };
    if (wallet.connected) {
      fetchCreditsOracle();
      const id = setInterval(fetchCreditsOracle, 30_000);
      return () => { cancelled = true; clearInterval(id); };
    }
  }, [wallet.connected, getMappingValue]);

  const selectedCollateral = collateralReceipts[selectedCollateralIdx];
  const tokenType = selectedCollateral?.tokenType ?? TOKEN_TYPES.ALEO;
  const isStablecoinCollateral = tokenType === TOKEN_TYPES.USDCX || tokenType === TOKEN_TYPES.USAD;
  const collateralTokenLabel = TOKEN_LABELS[tokenType] || 'ALEO';

  // Use the correct amount field based on token type
  const effectiveCollateral = isStablecoinCollateral
    ? (selectedCollateral?.collateralAmountU128 || 0)
    : (selectedCollateral?.collateralAmount || 0);

  const currentOraclePrice = oraclePrice || PRECISION;
  // Stablecoin price is pegged at $1 = PRECISION
  const stablecoinPrice = PRECISION;

  // For ALEO collateral → stablecoin borrow: maxBorrow = col * aleoPrice * LTV / (PRECISION * BPS)
  // For stablecoin collateral → ALEO borrow: maxBorrow = col * stablePrice * LTV / (aleoPrice * BPS)
  const maxBorrowAmount = isStablecoinCollateral
    ? (currentOraclePrice > 0
        ? Math.floor((effectiveCollateral * stablecoinPrice * 7_000) / (currentOraclePrice * 10_000))
        : 0)
    : calculateMaxBorrow(effectiveCollateral, currentOraclePrice);

  const borrowAmount = Math.floor(parseFloat(amount || '0') * 1_000_000);

  // For LTV: compute collateral value and borrow value in the same unit ($)
  const colValueUsd = isStablecoinCollateral
    ? (effectiveCollateral * stablecoinPrice) / PRECISION
    : (effectiveCollateral * currentOraclePrice) / PRECISION;
  const borrowValueUsd = isStablecoinCollateral
    ? (borrowAmount * currentOraclePrice) / PRECISION   // borrowing ALEO, convert to $
    : borrowAmount;                                      // borrowing stablecoins, already $
  const ltvRatio = colValueUsd > 0 ? (borrowValueUsd / colValueUsd) * 100 : 0;

  const projectedHealth = borrowAmount > 0
    ? (isStablecoinCollateral
        ? (colValueUsd * 800_000) / (PRECISION * borrowValueUsd) || Infinity
        : calculateHealthFactor(effectiveCollateral, borrowAmount, oraclePrice || PRECISION))
    : Infinity;
  const liquidationPrice = borrowAmount > 0
    ? calculateLiquidationPrice(borrowValueUsd, colValueUsd)
    : 0;

  // Constrain borrow assets based on collateral type
  const availableBorrowAssets: BorrowAsset[] = isStablecoinCollateral
    ? ['ALEO']
    : ['USDCx', 'USAD'];

  // Auto-correct borrow asset if not available for current collateral
  const validBorrowAsset = availableBorrowAssets.includes(borrowAsset)
    ? borrowAsset
    : availableBorrowAssets[0];

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

    const orchestratorAddress = wallet.address || '';
    const collateralRecord = selectedCollateral?.plaintext || '';

    try {
      let txId: string | null = null;
      if (validBorrowAsset === 'USDCx') {
        txId = await borrow(collateralRecord, borrowAmount, oraclePrice, orchestratorAddress);
      } else if (validBorrowAsset === 'USAD') {
        txId = await borrowUsad(collateralRecord, borrowAmount, oraclePrice, orchestratorAddress);
      } else {
        // Borrow ALEO credits against stablecoin collateral
        // Prices MUST match dara_lend_v8_credits.aleo's oracle_price mapping exactly
        if (!creditsAleoPrice) {
          toast.error('Credits oracle price not loaded — please wait and try again');
          return;
        }
        txId = await borrowCredits(collateralRecord, borrowAmount, stablecoinPrice, creditsAleoPrice, orchestratorAddress);
      }
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
      await updateOraclePrice(priceMicro, currentRound + 1, 0);
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
        className="rounded-xl glass-panel p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ArrowDownIcon size={16} className="text-primary" />
          </div>
          <div>
            <h2 className="font-headline text-lg text-text-primary">
              Borrow
            </h2>
            <p className="text-xs text-text-secondary">
              Borrow against your encrypted collateral
            </p>
          </div>
        </div>

        {/* Borrow Asset Selector */}
        <div className="mb-4">
          <label className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] block mb-2">
            Borrow Asset
          </label>
          <div className={`grid gap-2 ${availableBorrowAssets.length >= 3 ? 'grid-cols-3' : availableBorrowAssets.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {availableBorrowAssets.map((asset) => (
              <button
                key={asset}
                onClick={() => setBorrowAsset(asset)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  validBorrowAsset === asset
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-white/[0.03] border-white/[0.06] text-text-secondary hover:text-text-primary'
                }`}
              >
                <TokenIcon token={asset} size={18} />
                {asset}
              </button>
            ))}
          </div>
        </div>

        {/* Collateral Selector */}
        {collateralReceipts.length > 1 && (
          <div className="mb-4">
            <label className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] block mb-2">
              Select Collateral
            </label>
            <select
              value={selectedCollateralIdx}
              onChange={(e) => { setSelectedCollateralIdx(Number(e.target.value)); setAmount(''); }}
              className="w-full px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-text-primary text-sm focus:outline-none focus:border-primary/30"
              aria-label="Select collateral receipt"
            >
              {collateralReceipts.map((r, idx) => {
                const isStable = r.tokenType === TOKEN_TYPES.USDCX || r.tokenType === TOKEN_TYPES.USAD;
                const amt = isStable ? r.collateralAmountU128 : r.collateralAmount;
                const label = TOKEN_LABELS[r.tokenType] || 'ALEO';
                return (
                  <option key={idx} value={idx}>
                    {formatCredits(amt)} {label}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
              Collateral
            </p>
            <p className="font-mono text-sm text-text-primary tabular-nums">
              {formatCredits(effectiveCollateral)} {collateralTokenLabel}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03]">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
              Max Borrow
            </p>
            <p className="font-mono text-sm text-text-primary tabular-nums">
              {formatCredits(maxBorrowAmount)} {validBorrowAsset}
            </p>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] block mb-2">
            Borrow Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full px-4 py-4 rounded-lg bg-white/[0.03] border border-white/[0.06] text-text-primary font-mono text-xl tabular-nums placeholder:text-text-muted focus:outline-none focus:border-primary/30 transition-colors"
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
              className="w-full accent-primary h-1"
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
          <div className="flex justify-between py-2 px-3 rounded-lg bg-white/[0.03]">
            <span className="text-xs text-text-secondary">LTV Ratio</span>
            <span className={`font-mono text-xs tabular-nums ${ltvRatio > 65 ? 'text-accent-warning' : 'text-text-primary'}`}>
              {ltvRatio.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/[0.03]">
            <span className="text-xs text-text-secondary">Health Factor</span>
            <HealthFactorGauge value={projectedHealth} size={60} />
          </div>
          <div className="flex justify-between py-2 px-3 rounded-lg bg-white/[0.03]">
            <span className="text-xs text-text-secondary">Liquidation Price</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-text-primary tabular-nums">
                {liquidationPrice > 0 ? `${(liquidationPrice / PRECISION).toFixed(4)}` : '—'}
              </span>
              <LockIcon size={10} className="text-primary" />
            </div>
          </div>
        </div>

        {/* Encrypted callout */}
        <div className="mb-6 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-2">
            <ShieldIcon size={14} className="text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Your liquidation price will be <strong className="text-primary">ENCRYPTED</strong> on-chain.
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

        <button
          onClick={handleSubmit}
          disabled={borrowAmount <= 0 || borrowAmount > maxBorrowAmount || transactionPending || !selectedCollateral}
          className="w-full py-4 rounded-lg btn-signature text-[15px] font-label uppercase tracking-[0.1em] disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
        >
          {transactionPending ? 'Processing...' : 'Borrow'}
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
