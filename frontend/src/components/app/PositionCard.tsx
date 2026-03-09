import { PrivacyBadge } from '@/components/shared/PrivacyBadge';
import { TokenIcon } from '@/components/shared/TokenIcon';
import { formatCredits, truncateAddress } from '@/utils/formatting';
import type { DaraRecord } from '@/utils/records';
import toast from 'react-hot-toast';

interface PositionCardProps {
  record: DaraRecord;
}

function copyToClipboard(value: string) {
  navigator.clipboard.writeText(value).then(
    () => toast.success('Copied to clipboard'),
    () => toast.error('Copy failed'),
  );
}

export function PositionCard({ record }: PositionCardProps) {
  const renderFields = () => {
    switch (record.type) {
      case 'CollateralReceipt':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Collateral" value={`${formatCredits(record.collateralAmount)} ALEO`} icon="ALEO" />
            <Field label="Nonce Hash" value={truncateAddress(record.nonceHash, 8, 4)} mono copyValue={record.nonceHash} />
          </div>
        );
      case 'DebtPosition':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Debt" value={`${formatCredits(record.debtAmount)} USDCx`} icon="USDCx" />
            <Field label="Collateral" value={`${formatCredits(record.collateralAmount)} ALEO`} icon="ALEO" />
            <Field label="Liquidation Price" value={`${(record.liquidationPrice / 1_000_000).toFixed(4)}`} />
            <Field label="Loan ID" value={truncateAddress(record.loanId, 8, 4)} mono copyValue={record.loanId} />
          </div>
        );
      case 'RepaymentReceipt':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount Repaid" value={`${formatCredits(record.amountRepaid)} USDCx`} icon="USDCx" />
            <Field label="Collateral Returned" value={`${formatCredits(record.collateralReturned)} ALEO`} icon="ALEO" />
            <Field label="Loan ID" value={truncateAddress(record.loanId, 8, 4)} mono copyValue={record.loanId} />
          </div>
        );
      case 'LiquidationReceipt':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Collateral Seized" value={`${formatCredits(record.collateralSeized)} ALEO`} icon="ALEO" />
            <Field label="Debt Covered" value={`${formatCredits(record.debtCovered)} USDCx`} icon="USDCx" />
            <Field label="Loan ID" value={truncateAddress(record.loanId, 8, 4)} mono copyValue={record.loanId} />
          </div>
        );
      case 'LiquidationAuth':
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Collateral" value={`${formatCredits(record.collateralAmount)} ALEO`} icon="ALEO" />
            <Field label="Debt" value={`${formatCredits(record.debtAmount)} USDCx`} icon="USDCx" />
            <Field label="Borrower (hash)" value={truncateAddress(record.borrowerHash, 8, 4)} mono copyValue={record.borrowerHash} />
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
  copyValue,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyValue?: string;
  icon?: 'ALEO' | 'USDCx';
}) {
  return (
    <div>
      <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
        {label}
      </p>
      {copyValue ? (
        <button
          onClick={() => copyToClipboard(copyValue)}
          className={`text-sm text-text-primary hover:text-accent transition-colors cursor-pointer ${mono ? 'font-mono tabular-nums' : ''}`}
          title="Click to copy"
        >
          {value}
        </button>
      ) : (
        <p className={`text-sm text-text-primary flex items-center gap-1.5 ${mono ? 'font-mono tabular-nums' : ''}`}>
          {icon && <TokenIcon token={icon} size={16} />}
          {value}
        </p>
      )}
    </div>
  );
}
