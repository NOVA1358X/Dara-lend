import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { useOraclePrice } from '@/hooks/useProtocolStats';
import { useAppStore } from '@/stores/appStore';
import { formatCredits, calculateHealthFactor, calculateLiquidationPrice, calculateMaxBorrow } from '@/utils/formatting';
import { PRECISION } from '@/utils/constants';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { HealthFactorGauge } from '@/components/shared/HealthFactorGauge';
import { EmptyState } from '@/components/shared/EmptyState';
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
  const { borrow, resetTransaction } = useTransaction(wallet);
  const { collateralReceipts, isLoading } = useWalletRecords(wallet);
  const { data: oraclePrice } = useOraclePrice();

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

  if (!isLoading && collateralReceipts.length === 0) {
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
    // Pass the record plaintext string — Shield expects string inputs
    const collateralRecord = selectedCollateral?.plaintext || '';

    try {
      await borrow(collateralRecord, borrowAmount, oraclePrice, orchestratorAddress);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Borrow failed';
      toast.error(message);
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

        <button
          onClick={handleSubmit}
          disabled={borrowAmount <= 0 || borrowAmount > maxBorrowAmount || transactionPending}
          className="w-full py-4 rounded-lg bg-accent text-bg-primary font-medium text-[15px] hover:bg-accent-hover transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
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
