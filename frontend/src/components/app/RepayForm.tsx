import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { useAppStore } from '@/stores/appStore';
import { formatCredits, truncateAddress, calculateHealthFactor } from '@/utils/formatting';
import { PRECISION } from '@/utils/constants';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { EmptyState } from '@/components/shared/EmptyState';
import { PrivacyBadge } from '@/components/shared/PrivacyBadge';
import { UnlockIcon } from '@/components/icons/UnlockIcon';
import toast from 'react-hot-toast';

interface RepayFormProps {
  wallet: {
    requestRecords?: (program: string) => Promise<unknown[]>;
    requestTransaction?: (transaction: unknown) => Promise<string>;
    transactionStatus?: (txId: string) => Promise<string>;
    connected: boolean;
  };
}

export function RepayForm({ wallet }: RepayFormProps) {
  const navigate = useNavigate();
  const [selectedLoanIdx, setSelectedLoanIdx] = useState<number | null>(null);
  const { transactionStep, transactionId, transactionPending } = useAppStore();
  const { repay, resetTransaction } = useTransaction(wallet);
  const { debtPositions, creditsRecords, isLoading } = useWalletRecords(wallet);

  if (!wallet.connected) {
    return (
      <EmptyState
        title="Connect Wallet"
        description="Connect your Shield Wallet to view and repay your loans."
        action={{ label: 'Go Back', onClick: () => navigate('/app') }}
      />
    );
  }

  if (!isLoading && debtPositions.length === 0) {
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

    let paymentRecord: string | null = null;

    for (const r of creditsRecords as Array<{
      data?: { microcredits?: string };
      spent?: boolean;
      plaintext?: string;
    }>) {
      if (r.spent) continue;
      const mc = r.data?.microcredits;
      if (mc) {
        const val = parseInt(mc.replace('u64.private', '').replace('u64', ''), 10);
        if (val >= debt.debtAmount) {
          paymentRecord = r.plaintext || JSON.stringify(r);
          break;
        }
      }
    }

    if (!paymentRecord) {
      toast.error('Insufficient credits balance to repay this loan');
      return;
    }

    setSelectedLoanIdx(idx);
    const debtRecord = JSON.stringify(debt.raw);

    try {
      await repay(debtRecord, paymentRecord);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Repay failed';
      toast.error(message);
    }
  };

  return (
    <div className="max-w-[560px] mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <UnlockIcon size={16} className="text-accent" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Repay Loans
          </h2>
          <p className="text-xs text-text-secondary">
            Repay your debt and reclaim encrypted collateral
          </p>
        </div>
      </div>

      {debtPositions.map((debt, idx) => {
        const health = calculateHealthFactor(
          debt.collateralAmount,
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
            className="rounded-xl bg-bg-tertiary border border-border-default p-5"
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
                <p className="font-mono text-lg font-semibold text-text-primary tabular-nums">
                  {formatCredits(debt.debtAmount)} ALEO
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
                  Collateral Locked
                </p>
                <p className="font-mono text-sm text-text-primary tabular-nums">
                  {formatCredits(debt.collateralAmount)} ALEO
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
              className="w-full py-3 rounded-lg bg-accent text-bg-primary font-medium text-sm hover:bg-accent-hover transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
            >
              {transactionPending && selectedLoanIdx === idx ? 'Processing...' : 'Repay Full Amount'}
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
