import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { useProtocolStats } from '@/hooks/useProtocolStats';
import { PositionCard } from './PositionCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { LockIcon } from '@/components/icons/LockIcon';

interface PositionsListProps {
  wallet: {
    requestRecords?: (program: string) => Promise<unknown[]>;
    decrypt?: (cipherText: string) => Promise<string>;
    connected: boolean;
  };
}

export function PositionsList({ wallet }: PositionsListProps) {
  const navigate = useNavigate();
  const { collateralReceipts, debtPositions, repaymentReceipts, liquidationReceipts, isLoading } = useWalletRecords(wallet);
  const { data: stats } = useProtocolStats();

  if (!wallet.connected) {
    return (
      <EmptyState
        title="Connect Wallet"
        description="Connect your Shield Wallet to view your private positions."
        action={{ label: 'Go Back', onClick: () => navigate('/app') }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <LoadingSkeleton key={i} height={120} rounded="rounded-xl" />
        ))}
      </div>
    );
  }

  const allRecords = [...collateralReceipts, ...debtPositions, ...repaymentReceipts, ...liquidationReceipts];
  const hasOnChainPositions = stats && (stats.loanCount > 0 || stats.totalCollateral > 0);
  const walletRecordsEmpty = collateralReceipts.length === 0 && debtPositions.length === 0;

  if (allRecords.length === 0 && !hasOnChainPositions) {
    return (
      <EmptyState
        title="No Positions"
        description="You don't have any positions yet. Supply collateral to get started."
        icon={<LockIcon size={28} />}
        action={{ label: 'Supply Collateral', onClick: () => navigate('/app/supply') }}
      />
    );
  }

  return (
    <div className="space-y-8">
      {walletRecordsEmpty && hasOnChainPositions && (
        <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-yellow-300">Wallet Syncing Records</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Your wallet is syncing private records. On-chain data shows active positions.
                Try disconnecting and reconnecting your wallet if this persists.
              </p>
            </div>
          </div>
        </div>
      )}
      {collateralReceipts.length > 0 && (
        <Section title="Active Collateral" records={collateralReceipts} />
      )}
      {debtPositions.length > 0 && (
        <Section title="Active Loans" records={debtPositions} />
      )}
      {(repaymentReceipts.length > 0 || liquidationReceipts.length > 0) && (
        <Section title="History" records={[...repaymentReceipts, ...liquidationReceipts]} />
      )}
    </div>
  );
}

function Section({
  title,
  records,
}: {
  title: string;
  records: ReturnType<typeof useWalletRecords>['allRecords'];
}) {
  return (
    <div>
      <h2 className="font-label text-[10px] uppercase text-text-muted tracking-[0.2em] mb-4">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {records.map((record, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: idx * 0.06,
              type: 'spring',
              stiffness: 120,
              damping: 20,
            }}
          >
            <PositionCard record={record} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
