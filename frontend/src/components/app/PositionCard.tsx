import { PrivacyBadge } from '@/components/shared/PrivacyBadge';
import { TokenIcon } from '@/components/shared/TokenIcon';
import { formatCredits, truncateAddress } from '@/utils/formatting';
import { TOKEN_LABELS, TOKEN_TYPES } from '@/utils/constants';
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

type TokenIconLabel = 'ALEO' | 'USDCx' | 'USAD';

export function PositionCard({ record }: PositionCardProps) {
  const renderFields = () => {
    switch (record.type) {
      case 'CollateralReceipt': {
        const isStable = record.tokenType === TOKEN_TYPES.USDCX || record.tokenType === TOKEN_TYPES.USAD;
        const amt = isStable ? record.collateralAmountU128 : record.collateralAmount;
        const label = (TOKEN_LABELS[record.tokenType] || 'ALEO') as TokenIconLabel;
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Collateral" value={`${formatCredits(amt)} ${label}`} icon={label} />
            <Field label="Nonce Hash" value={truncateAddress(record.nonceHash, 8, 4)} mono copyValue={record.nonceHash} />
          </div>
        );
      }
      case 'DebtPosition': {
        const debtLabel = (TOKEN_LABELS[record.debtToken] || 'USDCx') as TokenIconLabel;
        const colIsStable = record.collateralToken === TOKEN_TYPES.USDCX || record.collateralToken === TOKEN_TYPES.USAD;
        const colAmt = colIsStable ? record.collateralAmountU128 : record.collateralAmount;
        const colLabel = (TOKEN_LABELS[record.collateralToken] || 'ALEO') as TokenIconLabel;
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Debt" value={`${formatCredits(record.debtAmount)} ${debtLabel}`} icon={debtLabel} />
            <Field label="Collateral" value={`${formatCredits(colAmt)} ${colLabel}`} icon={colLabel} />
            <Field label="Liquidation Price" value={`${(record.liquidationPrice / 1_000_000).toFixed(4)}`} />
            <Field label="Loan ID" value={truncateAddress(record.loanId, 8, 4)} mono copyValue={record.loanId} />
          </div>
        );
      }
      case 'RepaymentReceipt': {
        const repayDebtLabel = (TOKEN_LABELS[record.collateralToken] || 'USDCx') as TokenIconLabel;
        const repayColIsStable = record.collateralToken === TOKEN_TYPES.USDCX || record.collateralToken === TOKEN_TYPES.USAD;
        const repayColAmt = repayColIsStable ? record.collateralReturnedU128 : record.collateralReturned;
        const repayColLabel = (TOKEN_LABELS[record.collateralToken] || 'ALEO') as TokenIconLabel;
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount Repaid" value={`${formatCredits(record.amountRepaid)}`} icon={repayDebtLabel} />
            <Field label="Collateral Returned" value={`${formatCredits(repayColAmt)} ${repayColLabel}`} icon={repayColLabel} />
            <Field label="Loan ID" value={truncateAddress(record.loanId, 8, 4)} mono copyValue={record.loanId} />
          </div>
        );
      }
      case 'LiquidationReceipt': {
        const liqColIsStable = record.collateralToken === TOKEN_TYPES.USDCX || record.collateralToken === TOKEN_TYPES.USAD;
        const liqColAmt = liqColIsStable ? record.collateralSeizedU128 : record.collateralSeized;
        const liqColLabel = (TOKEN_LABELS[record.collateralToken] || 'ALEO') as TokenIconLabel;
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Collateral Seized" value={`${formatCredits(liqColAmt)} ${liqColLabel}`} icon={liqColLabel} />
            <Field label="Debt Covered" value={`${formatCredits(record.debtCovered)}`} />
            <Field label="Loan ID" value={truncateAddress(record.loanId, 8, 4)} mono copyValue={record.loanId} />
          </div>
        );
      }
      case 'LiquidationAuth': {
        const authColIsStable = record.collateralToken === TOKEN_TYPES.USDCX || record.collateralToken === TOKEN_TYPES.USAD;
        const authColAmt = authColIsStable ? record.collateralAmountU128 : record.collateralAmount;
        const authColLabel = (TOKEN_LABELS[record.collateralToken] || 'ALEO') as TokenIconLabel;
        const authDebtLabel = (TOKEN_LABELS[record.debtToken] || 'USDCx') as TokenIconLabel;
        return (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Collateral" value={`${formatCredits(authColAmt)} ${authColLabel}`} icon={authColLabel} />
            <Field label="Debt" value={`${formatCredits(record.debtAmount)} ${authDebtLabel}`} icon={authDebtLabel} />
            <Field label="Borrower (hash)" value={truncateAddress(record.borrowerHash, 8, 4)} mono copyValue={record.borrowerHash} />
          </div>
        );
      }
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
    <div className="rounded-xl glass-panel-sm p-5 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-text-secondary">
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
  icon?: 'ALEO' | 'USDCx' | 'USAD';
}) {
  return (
    <div>
      <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
        {label}
      </p>
      {copyValue ? (
        <button
          onClick={() => copyToClipboard(copyValue)}
          className={`text-sm text-text-primary hover:text-primary transition-colors cursor-pointer ${mono ? 'font-mono tabular-nums' : ''}`}
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
