import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { useOraclePrice } from '@/hooks/useProtocolStats';
import { useAppStore } from '@/stores/appStore';
import { formatCredits, truncateAddress } from '@/utils/formatting';
import { PRECISION, ALEO_TESTNET_API, PROGRAM_ID, MAPPINGS, MAPPING_KEYS } from '@/utils/constants';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { PrivacyBadge } from '@/components/shared/PrivacyBadge';
import { ZapIcon } from '@/components/icons/ZapIcon';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import toast from 'react-hot-toast';

interface LiquidateFormProps {
  wallet: {
    requestRecords?: (program: string) => Promise<unknown[]>;
    requestTransaction?: (transaction: any) => Promise<{ transactionId: string } | undefined>;
    transactionStatus?: (txId: string) => Promise<{ status: string }>;
    decrypt?: (cipherText: string) => Promise<string>;
    connected: boolean;
    address?: string | null;
  };
}

export function LiquidateForm({ wallet }: LiquidateFormProps) {
  const navigate = useNavigate();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [currentOraclePrice, setCurrentOraclePrice] = useState<number | null>(null);
  const { transactionStep, transactionId, transactionPending } = useAppStore();
  const { liquidate, resetTransaction } = useTransaction(wallet);
  const { liquidationAuths, isLoading, refetch } = useWalletRecords(wallet);
  const { data: oraclePrice } = useOraclePrice();

  // Fetch latest oracle price from on-chain mapping
  const fetchOraclePrice = useCallback(async () => {
    try {
      const url = `${ALEO_TESTNET_API}/program/${PROGRAM_ID}/mapping/${MAPPINGS.ORACLE_PRICE}/${MAPPING_KEYS.GLOBAL}`;
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        const cleaned = text.replace(/"/g, '').replace('u64', '').trim();
        const val = parseInt(cleaned, 10);
        if (!isNaN(val) && val > 0) {
          setCurrentOraclePrice(val);
          return;
        }
      }
    } catch { /* fallback below */ }
    // Fallback to the hook's oracle price
    if (oraclePrice) setCurrentOraclePrice(oraclePrice);
  }, [oraclePrice]);

  useEffect(() => {
    fetchOraclePrice();
    const interval = setInterval(fetchOraclePrice, 30_000);
    return () => clearInterval(interval);
  }, [fetchOraclePrice]);

  if (!wallet.connected) {
    return (
      <EmptyState
        title="Connect Wallet"
        description="Connect your Shield Wallet to view liquidatable positions."
        action={{ label: 'Go Back', onClick: () => navigate('/app') }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-[560px] mx-auto space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <LoadingSkeleton key={i} height={200} rounded="rounded-xl" />
        ))}
      </div>
    );
  }

  if (liquidationAuths.length === 0) {
    return (
      <EmptyState
        title="No Liquidation Authorizations"
        description="You don't hold any LiquidationAuth records. These are created when you borrow — the orchestrator address receives them and can liquidate underwater positions."
        action={{ label: 'Dashboard', onClick: () => navigate('/app') }}
      />
    );
  }

  const handleLiquidate = async (idx: number) => {
    const auth = liquidationAuths[idx];
    if (!auth) return;

    if (!currentOraclePrice) {
      toast.error('Oracle price unavailable — cannot liquidate');
      return;
    }

    // Check if the position is actually underwater
    if (currentOraclePrice > auth.liquidationPrice) {
      toast.error(
        `Position is healthy. Oracle price (${(currentOraclePrice / PRECISION).toFixed(4)}) is above liquidation price (${(auth.liquidationPrice / PRECISION).toFixed(4)}).`,
      );
      return;
    }

    setSelectedIdx(idx);
    const recordPlaintext = auth.plaintext || '';

    try {
      const txId = await liquidate(recordPlaintext, currentOraclePrice);
      if (txId) {
        setTimeout(() => refetch(), 3000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Liquidation failed';
      toast.error(message);
    }
  };

  return (
    <div className="max-w-[560px] mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-accent-danger/10 flex items-center justify-center">
          <ZapIcon size={16} className="text-accent-danger" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Liquidation
          </h2>
          <p className="text-xs text-text-secondary">
            Liquidate underwater positions to protect protocol solvency
          </p>
        </div>
      </div>

      {/* Oracle Price Display */}
      <div className="rounded-xl bg-bg-tertiary border border-border-default p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldIcon size={14} className="text-accent" />
            <span className="text-xs text-text-muted uppercase tracking-wider">
              Current Oracle Price
            </span>
          </div>
          <span className="font-mono text-sm text-text-primary tabular-nums">
            {currentOraclePrice
              ? `$${(currentOraclePrice / PRECISION).toFixed(4)}`
              : '—'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
        <div className="flex items-start gap-2">
          <ShieldIcon size={14} className="text-accent mt-0.5 flex-shrink-0" />
          <p className="text-xs text-text-secondary leading-relaxed">
            Positions can be liquidated when the oracle price drops below the
            liquidation price. The collateral is seized and debt is cleared from
            the protocol. Only the LiquidationAuth record holder can trigger this.
          </p>
        </div>
      </div>

      {liquidationAuths.map((auth, idx) => {
        const isUnderwater = currentOraclePrice
          ? currentOraclePrice <= auth.liquidationPrice
          : false;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: idx * 0.08,
              type: 'spring',
              stiffness: 120,
              damping: 20,
            }}
            className={`rounded-xl bg-bg-tertiary border p-5 ${
              isUnderwater
                ? 'border-accent-danger/40'
                : 'border-border-default'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <PrivacyBadge variant="private" />
              <div className="flex items-center gap-2">
                {isUnderwater && (
                  <span className="text-[10px] font-medium text-accent-danger bg-accent-danger/10 px-2 py-0.5 rounded">
                    UNDERWATER
                  </span>
                )}
                <span className="font-mono text-[11px] text-text-muted">
                  {truncateAddress(auth.loanId, 8, 4)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
                  Collateral
                </p>
                <p className="font-mono text-sm text-text-primary tabular-nums">
                  {formatCredits(auth.collateralAmount)} ALEO
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
                  Debt
                </p>
                <p className="font-mono text-sm text-text-primary tabular-nums">
                  {formatCredits(auth.debtAmount)} USDCx
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
                  Liquidation Price
                </p>
                <p className={`font-mono text-sm tabular-nums ${
                  isUnderwater ? 'text-accent-danger' : 'text-text-primary'
                }`}>
                  ${(auth.liquidationPrice / PRECISION).toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
                  Borrower (hash)
                </p>
                <p className="font-mono text-[11px] text-text-secondary">
                  {truncateAddress(auth.borrowerHash, 8, 4)}
                </p>
              </div>
            </div>

            {selectedIdx === idx && transactionPending && (
              <div className="mb-4">
                <TransactionFlow currentStep={transactionStep} txId={transactionId} />
              </div>
            )}

            <button
              onClick={() => handleLiquidate(idx)}
              disabled={transactionPending || !isUnderwater}
              className={`w-full py-3 rounded-lg font-medium text-sm transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-ring ${
                isUnderwater
                  ? 'bg-accent-danger text-white hover:bg-accent-danger/80'
                  : 'bg-bg-secondary text-text-muted cursor-not-allowed'
              }`}
            >
              {transactionPending && selectedIdx === idx
                ? 'Processing...'
                : isUnderwater
                ? 'Liquidate Position'
                : 'Position Healthy'}
            </button>
          </motion.div>
        );
      })}

      {transactionStep === 'confirmed' && (
        <button
          onClick={resetTransaction}
          className="w-full py-2 text-sm text-text-secondary hover:text-text-primary transition-colors text-center"
        >
          Done
        </button>
      )}
    </div>
  );
}
