import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWalletRecords } from '@/hooks/useWalletRecords';
import { RECORD_TYPES } from '@/utils/constants';
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
  const { allRecords, isLoading } = useWalletRecords(wallet);

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

  const collateralRecords = allRecords.filter(
    (r) => r.type === RECORD_TYPES.COLLATERAL_RECEIPT && !r.spent,
  );
  const debtRecords = allRecords.filter(
    (r) => r.type === RECORD_TYPES.DEBT_POSITION && !r.spent,
  );
  const historyRecords = allRecords.filter(
    (r) =>
      (r.type === RECORD_TYPES.REPAYMENT_RECEIPT ||
      r.type === RECORD_TYPES.LIQUIDATION_RECEIPT) && !r.spent,
  );

  if (allRecords.length === 0) {
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
      {collateralRecords.length > 0 && (
        <Section title="Active Collateral" records={collateralRecords} />
      )}
      {debtRecords.length > 0 && (
        <Section title="Active Loans" records={debtRecords} />
      )}
      {historyRecords.length > 0 && (
        <Section title="History" records={historyRecords} />
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
