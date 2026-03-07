import { PrivacyBadge } from '@/components/shared/PrivacyBadge';
import { formatCredits, truncateAddress } from '@/utils/formatting';
import type { DaraRecord } from '@/utils/records';

interface PositionCardProps {
  record: DaraRecord;
}

export function PositionCard({ record }: PositionCardProps) {
  const renderFields = () => {
    switch (record.type) {
      case 'CollateralReceipt':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Collateral" value={`${formatCredits(record.collateralAmount)} ALEO`} />
            <Field label="Nonce Hash" value={truncateAddress(record.nonceHash, 8, 4)} mono />
          </div>
        );
      case 'DebtPosition':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Debt" value={`${formatCredits(record.debtAmount)} ALEO`} />
            <Field label="Collateral" value={`${formatCredits(record.collateralAmount)} ALEO`} />
            <Field label="Liquidation Price" value={`${(record.liquidationPrice / 1_000_000).toFixed(4)}`} />
            <Field label="Loan ID" value={truncateAddress(record.loanId, 8, 4)} mono />
          </div>
        );
      case 'RepaymentReceipt':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount Repaid" value={`${formatCredits(record.amountRepaid)} ALEO`} />
            <Field label="Collateral Returned" value={`${formatCredits(record.collateralReturned)} ALEO`} />
            <Field label="Loan ID" value={truncateAddress(record.loanId, 8, 4)} mono />
          </div>
        );
      case 'LiquidationReceipt':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Collateral Seized" value={`${formatCredits(record.collateralSeized)} ALEO`} />
            <Field label="Debt Covered" value={`${formatCredits(record.debtCovered)} ALEO`} />
            <Field label="Loan ID" value={truncateAddress(record.loanId, 8, 4)} mono />
          </div>
        );
      case 'LiquidationAuth':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Collateral" value={`${formatCredits(record.collateralAmount)} ALEO`} />
            <Field label="Debt" value={`${formatCredits(record.debtAmount)} ALEO`} />
            <Field label="Borrower" value={truncateAddress(record.borrower)} mono />
          </div>
        );
      default:
        return null;
    }
  };

  const typeLabel: Record<string, string> = {
    CollateralReceipt: 'Active Collateral',
    DebtPosition: 'Active Loan',
    LiquidationAuth: 'Liquidation Auth',
    RepaymentReceipt: 'Repayment',
    LiquidationReceipt: 'Liquidation',
  };

  return (
    <div className="rounded-xl bg-bg-tertiary border border-border-default p-5 hover:border-border-hover transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-text-secondary">
          {typeLabel[record.type] || record.type}
        </span>
        <PrivacyBadge variant="private" />
      </div>
      {renderFields()}
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-sm text-text-primary ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value}
      </p>
    </div>
  );
}
