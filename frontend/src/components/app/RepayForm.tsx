import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { useAppStore } from '@/stores/appStore';
import { formatCredits, truncateAddress, calculateHealthFactor } from '@/utils/formatting';
import { markRecordConsumed } from '@/utils/records';
import { PRECISION, TOKEN_TYPES, TOKEN_LABELS } from '@/utils/constants';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { PrivacyBadge } from '@/components/shared/PrivacyBadge';
import { TokenIcon } from '@/components/shared/TokenIcon';
import { UnlockIcon } from '@/components/icons/UnlockIcon';
import toast from 'react-hot-toast';

interface RepayFormProps {
  wallet: {
    requestRecords?: (program: string) => Promise<unknown[]>;
    requestTransaction?: (transaction: any) => Promise<{ transactionId: string } | undefined>;
    transactionStatus?: (txId: string) => Promise<{ status: string }>;
    decrypt?: (cipherText: string) => Promise<string>;
    connected: boolean;
  };
}

export function RepayForm({ wallet }: RepayFormProps) {
  const navigate = useNavigate();
  const [selectedLoanIdx, setSelectedLoanIdx] = useState<number | null>(null);
  const [repayStep, setRepayStep] = useState<'idle' | 'approving' | 'repaying'>('idle');
  const { transactionStep, transactionId, transactionPending } = useAppStore();
  const { repay, repayUsad, repayCreditsUsdcx, repayCreditsUsad, approveUSDCx, resetTransaction } = useTransaction(wallet);
  const { debtPositions, creditsRecords, isLoading, refetch } = useWalletRecords(wallet);

  if (!wallet.connected) {
    return (
      <EmptyState
        title="Connect Wallet"
        description="Connect your Shield Wallet to view and repay your loans."
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

  if (debtPositions.length === 0) {
    return (
      <EmptyState
        title="No Active Loans"
        description="You don't have any outstanding debt. Start by supplying collateral and borrowing."
        action={{ label: 'Supply Collateral', onClick: () => navigate('/app/supply') }}
      />
    );
  }

  const handleRepay = async (idx: number) => {
    const debt = debtPositions[idx];
    if (!debt) return;

    setSelectedLoanIdx(idx);
    const debtRecord = debt.plaintext || '';
    const debtToken = debt.debtToken ?? 1; // 0=ALEO,1=USDCx,2=USAD
    const collateralToken = debt.collateralToken ?? 0;

    try {
      if (debtToken === 0) {
        // Repaying ALEO credits debt — need a private credits record
        const creditsRecord = creditsRecords?.[0];
        if (!creditsRecord) {
          toast.error('No private credits record found. Convert credits to private first.');
          setRepayStep('idle');
          return;
        }
        const creditsPlaintext = (creditsRecord as Record<string, unknown>).recordPlaintext as string
          || (creditsRecord as Record<string, unknown>).plaintext as string || '';
        setRepayStep('repaying');
        let repayTxId: string | null = null;
        if (collateralToken === 1) {
          repayTxId = await repayCreditsUsdcx(debtRecord, creditsPlaintext);
        } else {
          repayTxId = await repayCreditsUsad(debtRecord, creditsPlaintext);
        }
        setRepayStep('idle');
        if (repayTxId) {
          const commitment = (debt.raw.commitment as string) || (debt.raw.tag as string) || '';
          if (commitment) markRecordConsumed(commitment);
          refetch();
        }
      } else {
        // Repaying stablecoin debt (USDCx or USAD)
        // Step 1: Approve spending
        setRepayStep('approving');
        const approveTxId = await approveUSDCx(debt.debtAmount);
        if (!approveTxId) {
          setRepayStep('idle');
          return;
        }

        // Step 2: Execute repay
        setRepayStep('repaying');
        let repayTxId: string | null = null;
        if (debtToken === 2) {
          repayTxId = await repayUsad(debtRecord);
        } else {
          repayTxId = await repay(debtRecord);
        }
        setRepayStep('idle');
        if (repayTxId) {
          const commitment = (debt.raw.commitment as string) || (debt.raw.tag as string) || '';
          if (commitment) markRecordConsumed(commitment);
          refetch();
        }
      }
    } catch (err) {
      setRepayStep('idle');
      const message = err instanceof Error ? err.message : 'Repay failed';
      toast.error(message);
    }
  };

  return (
    <div className="max-w-[560px] mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <UnlockIcon size={16} className="text-primary" />
        </div>
        <div>
          <h2 className="font-headline text-lg text-text-primary">
            Repay Loans
          </h2>
          <p className="text-xs text-text-secondary">
            Repay debt and reclaim collateral as a private record
          </p>
        </div>
      </div>

      {debtPositions.map((debt, idx) => {
        const debtTokenLabel = debt.debtToken === 0 ? 'ALEO' : debt.debtToken === 2 ? 'USAD' : 'USDCx';
        const colTokenLabel = debt.collateralToken === 1 ? 'USDCx' : debt.collateralToken === 2 ? 'USAD' : 'ALEO';
        const colIsStable = debt.collateralToken === TOKEN_TYPES.USDCX || debt.collateralToken === TOKEN_TYPES.USAD;
        const effectiveCollateral = colIsStable ? debt.collateralAmountU128 : debt.collateralAmount;
        const health = calculateHealthFactor(
          effectiveCollateral,
          debt.debtAmount,
          PRECISION,
        );

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
            className="rounded-xl glass-panel p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <PrivacyBadge variant="private" />
              <span className="font-mono text-[11px] text-text-muted">
                {truncateAddress(debt.loanId, 8, 4)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
                  Debt
                </p>
                <p className="font-mono text-lg font-semibold text-text-primary tabular-nums flex items-center gap-1.5">
                  <TokenIcon token={debtTokenLabel} size={18} />
                  {formatCredits(debt.debtAmount)} {debtTokenLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
                  Collateral Locked
                </p>
                <p className="font-mono text-sm text-text-primary tabular-nums flex items-center gap-1.5">
                  <TokenIcon token={colTokenLabel} size={16} />
                  {formatCredits(effectiveCollateral)} {colTokenLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
                  Health Factor
                </p>
                <p
                  className={`font-mono text-sm tabular-nums ${
                    health >= 2.0
                      ? 'text-accent-success'
                      : health >= 1.5
                      ? 'text-accent'
                      : health >= 1.2
                      ? 'text-accent-warning'
                      : 'text-accent-danger'
                  }`}
                >
                  {health === Infinity ? '∞' : health.toFixed(2)}
                </p>
              </div>
            </div>

            {selectedLoanIdx === idx && transactionPending && (
              <div className="mb-4">
                <TransactionFlow currentStep={transactionStep} txId={transactionId} />
              </div>
            )}

            <button
              onClick={() => handleRepay(idx)}
              disabled={transactionPending}
              className="w-full py-3 rounded-lg btn-signature font-label uppercase tracking-[0.1em] text-sm disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
            >
              {transactionPending && selectedLoanIdx === idx
                ? repayStep === 'approving'
                  ? `Step 1/2: Approving ${debtTokenLabel}...`
                  : 'Step 2/2: Repaying...'
                : 'Repay Full Amount'}
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
