import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTransaction } from '@/hooks/useTransaction';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { useAppStore } from '@/stores/appStore';
import { formatCredits, truncateAddress } from '@/utils/formatting';
import { markRecordConsumed } from '@/utils/records';
import { TransactionFlow } from '@/components/shared/TransactionFlow';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { PrivacyBadge } from '@/components/shared/PrivacyBadge';
import { TokenIcon } from '@/components/shared/TokenIcon';
import { UnlockIcon } from '@/components/icons/UnlockIcon';
import { ShieldIcon } from '@/components/icons/ShieldIcon';
import toast from 'react-hot-toast';

interface WithdrawFormProps {
  wallet: {
    requestRecords?: (program: string) => Promise<unknown[]>;
    requestTransaction?: (transaction: any) => Promise<{ transactionId: string } | undefined>;
    transactionStatus?: (txId: string) => Promise<{ status: string }>;
    decrypt?: (cipherText: string) => Promise<string>;
    connected: boolean;
    address?: string | null;
  };
}

export function WithdrawForm({ wallet }: WithdrawFormProps) {
  const navigate = useNavigate();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const { transactionStep, transactionId, transactionPending } = useAppStore();
  const { withdrawCollateral, resetTransaction } = useTransaction(wallet);
  const { collateralReceipts, isLoading, refetch } = useWalletRecords(wallet);

  const handleDismiss = (idx: number) => {
    const receipt = collateralReceipts[idx];
    if (!receipt) return;
    const commitment = (receipt.raw.commitment as string) || '';
    if (commitment) {
      markRecordConsumed(commitment);
      refetch();
    }
  };

  if (!wallet.connected) {
    return (
      <EmptyState
        title="Connect Wallet"
        description="Connect your Shield Wallet to withdraw your collateral."
        action={{ label: 'Go Back', onClick: () => navigate('/app') }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-[560px] mx-auto space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <LoadingSkeleton key={i} height={180} rounded="rounded-xl" />
        ))}
      </div>
    );
  }

  if (collateralReceipts.length === 0) {
    return (
      <EmptyState
        title="No Collateral to Withdraw"
        description="You don't have any collateral deposits. Supply ALEO first to create a position."
        action={{ label: 'Supply Collateral', onClick: () => navigate('/app/supply') }}
      />
    );
  }

  const handleWithdraw = async (idx: number) => {
    const receipt = collateralReceipts[idx];
    if (!receipt) return;

    setSelectedIdx(idx);
    const recordPlaintext = receipt.plaintext || '';

    try {
      const txId = await withdrawCollateral(recordPlaintext);
      if (txId) {
        // Mark record as consumed so it stays hidden even across navigation
        const commitment = (receipt.raw.commitment as string) || (receipt.raw.tag as string) || '';
        if (commitment) markRecordConsumed(commitment);
        refetch();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Withdraw failed';
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
            Withdraw Collateral
          </h2>
          <p className="text-xs text-text-secondary">
            Reclaim your encrypted ALEO collateral from the protocol
          </p>
        </div>
      </div>

      {/* Privacy Info */}
      <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
        <div className="flex items-start gap-2">
          <ShieldIcon size={14} className="text-accent mt-0.5 flex-shrink-0" />
          <p className="text-xs text-text-secondary leading-relaxed">
            Your collateral receipt is an encrypted private record. Only you can withdraw
            it — no one else can see or claim your deposit.
          </p>
        </div>
      </div>

      {collateralReceipts.map((receipt, idx) => (
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
              {truncateAddress(receipt.nonceHash, 8, 4)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
                Collateral Amount
              </p>
              <p className="font-mono text-lg font-semibold text-text-primary tabular-nums flex items-center gap-1.5">
                <TokenIcon token="ALEO" size={18} />
                {formatCredits(receipt.collateralAmount)} ALEO
              </p>
            </div>
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
                Deposit Block
              </p>
              <p className="font-mono text-sm text-text-primary tabular-nums">
                {receipt.depositBlock || '—'}
              </p>
            </div>
          </div>

          {selectedIdx === idx && transactionPending && (
            <div className="mb-4">
              <TransactionFlow currentStep={transactionStep} txId={transactionId} />
            </div>
          )}

          <button
            onClick={() => handleWithdraw(idx)}
            disabled={transactionPending}
            className="w-full py-3 rounded-lg bg-accent text-bg-primary font-medium text-sm hover:bg-accent-hover transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
          >
            {transactionPending && selectedIdx === idx ? 'Processing...' : 'Withdraw Collateral'}
          </button>
          <button
            onClick={() => handleDismiss(idx)}
            className="w-full mt-2 py-2 text-xs text-text-muted hover:text-accent-danger transition-colors text-center"
          >
            Already withdrawn? Hide this record
          </button>
        </motion.div>
      ))}

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
