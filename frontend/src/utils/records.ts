import { RECORD_TYPES } from './constants';
import { parseAleoU64, parseAleoField, parseAleoAddress } from './formatting';

export interface CollateralReceiptRecord {
  type: typeof RECORD_TYPES.COLLATERAL_RECEIPT;
  owner: string;
  collateralAmount: number;
  depositBlock: number;
  nonceHash: string;
  raw: Record<string, unknown>;
  spent: boolean;
}

export interface DebtPositionRecord {
  type: typeof RECORD_TYPES.DEBT_POSITION;
  owner: string;
  collateralAmount: number;
  debtAmount: number;
  liquidationPrice: number;
  loanId: string;
  raw: Record<string, unknown>;
  spent: boolean;
}

export interface LiquidationAuthRecord {
  type: typeof RECORD_TYPES.LIQUIDATION_AUTH;
  owner: string;
  loanId: string;
  collateralAmount: number;
  debtAmount: number;
  liquidationPrice: number;
  borrower: string;
  raw: Record<string, unknown>;
  spent: boolean;
}

export interface RepaymentReceiptRecord {
  type: typeof RECORD_TYPES.REPAYMENT_RECEIPT;
  owner: string;
  amountRepaid: number;
  collateralReturned: number;
  loanId: string;
  raw: Record<string, unknown>;
  spent: boolean;
}

export interface LiquidationReceiptRecord {
  type: typeof RECORD_TYPES.LIQUIDATION_RECEIPT;
  owner: string;
  loanId: string;
  collateralSeized: number;
  debtCovered: number;
  raw: Record<string, unknown>;
  spent: boolean;
}

export type DaraRecord =
  | CollateralReceiptRecord
  | DebtPositionRecord
  | LiquidationAuthRecord
  | RepaymentReceiptRecord
  | LiquidationReceiptRecord;

interface RawAleoRecord {
  data?: Record<string, string>;
  spent?: boolean;
  plaintext?: string;
  programId?: string;
  program_id?: string;
  functionName?: string;
  recordName?: string;
  // Shield may return fields at top level
  [key: string]: unknown;
}

function extractFields(record: RawAleoRecord): Record<string, string> {
  // 1. Try record.data first (standard format)
  if (record.data && typeof record.data === 'object') {
    return record.data;
  }

  // 2. Try plaintext parsing (Shield format)
  if (record.plaintext && typeof record.plaintext === 'string') {
    const fields: Record<string, string> = {};
    const text = record.plaintext;
    // Handle both multi-line and single-line plaintext
    const lines = text.includes('\n') ? text.split('\n') : text.replace(/[{}]/g, '').split(',');
    for (const line of lines) {
      const match = line.trim().match(/^(\w+)\s*:\s*(.+?)[\s,]*$/);
      if (match) {
        fields[match[1]] = match[2];
      }
    }
    if (Object.keys(fields).length > 0) return fields;
  }

  // 3. Try top-level fields (some adapters put fields directly on the record object)
  const knownFields = [
    'owner', 'collateral_amount', 'deposit_block', 'nonce_hash',
    'debt_amount', 'liquidation_price', 'loan_id', 'borrower',
    'amount_repaid', 'collateral_returned', 'collateral_seized', 'debt_covered',
  ];
  const fields: Record<string, string> = {};
  for (const key of knownFields) {
    if (key in record && record[key] !== undefined) {
      fields[key] = String(record[key]);
    }
  }
  if (Object.keys(fields).length > 0) return fields;

  return {};
}

function detectRecordType(fields: Record<string, string>, record: RawAleoRecord): string | null {
  // Shield may use recordName or record_name
  if (record.recordName) return record.recordName;
  if (typeof record['record_name'] === 'string') return record['record_name'] as string;

  const keys = Object.keys(fields).filter(k => k !== 'owner' && k !== '_nonce');

  if (keys.includes('collateral_amount') && keys.includes('deposit_block') && keys.includes('nonce_hash') && !keys.includes('debt_amount')) {
    return RECORD_TYPES.COLLATERAL_RECEIPT;
  }
  if (keys.includes('debt_amount') && keys.includes('liquidation_price') && keys.includes('loan_id') && !keys.includes('borrower')) {
    return RECORD_TYPES.DEBT_POSITION;
  }
  if (keys.includes('borrower') && keys.includes('loan_id') && keys.includes('liquidation_price')) {
    return RECORD_TYPES.LIQUIDATION_AUTH;
  }
  if (keys.includes('amount_repaid') && keys.includes('collateral_returned')) {
    return RECORD_TYPES.REPAYMENT_RECEIPT;
  }
  if (keys.includes('collateral_seized') && keys.includes('debt_covered')) {
    return RECORD_TYPES.LIQUIDATION_RECEIPT;
  }
  return null;
}

export function parseRecord(rawRecord: Record<string, unknown>): DaraRecord | null {
  const record = rawRecord as unknown as RawAleoRecord;
  const fields = extractFields(record);
  const recordType = detectRecordType(fields, record);
  const spent = record.spent ?? false;

  if (!recordType) return null;

  const owner = parseAleoAddress(fields['owner'] || '');

  switch (recordType) {
    case RECORD_TYPES.COLLATERAL_RECEIPT:
      return {
        type: RECORD_TYPES.COLLATERAL_RECEIPT,
        owner,
        collateralAmount: parseAleoU64(fields['collateral_amount']),
        depositBlock: parseAleoU64(fields['deposit_block']),
        nonceHash: parseAleoField(fields['nonce_hash']),
        raw: rawRecord,
        spent,
      };

    case RECORD_TYPES.DEBT_POSITION:
      return {
        type: RECORD_TYPES.DEBT_POSITION,
        owner,
        collateralAmount: parseAleoU64(fields['collateral_amount']),
        debtAmount: parseAleoU64(fields['debt_amount']),
        liquidationPrice: parseAleoU64(fields['liquidation_price']),
        loanId: parseAleoField(fields['loan_id']),
        raw: rawRecord,
        spent,
      };

    case RECORD_TYPES.LIQUIDATION_AUTH:
      return {
        type: RECORD_TYPES.LIQUIDATION_AUTH,
        owner,
        loanId: parseAleoField(fields['loan_id']),
        collateralAmount: parseAleoU64(fields['collateral_amount']),
        debtAmount: parseAleoU64(fields['debt_amount']),
        liquidationPrice: parseAleoU64(fields['liquidation_price']),
        borrower: parseAleoAddress(fields['borrower']),
        raw: rawRecord,
        spent,
      };

    case RECORD_TYPES.REPAYMENT_RECEIPT:
      return {
        type: RECORD_TYPES.REPAYMENT_RECEIPT,
        owner,
        amountRepaid: parseAleoU64(fields['amount_repaid']),
        collateralReturned: parseAleoU64(fields['collateral_returned']),
        loanId: parseAleoField(fields['loan_id']),
        raw: rawRecord,
        spent,
      };

    case RECORD_TYPES.LIQUIDATION_RECEIPT:
      return {
        type: RECORD_TYPES.LIQUIDATION_RECEIPT,
        owner,
        loanId: parseAleoField(fields['loan_id']),
        collateralSeized: parseAleoU64(fields['collateral_seized']),
        debtCovered: parseAleoU64(fields['debt_covered']),
        raw: rawRecord,
        spent,
      };

    default:
      return null;
  }
}

export function filterRecordsByType<T extends DaraRecord>(
  records: DaraRecord[],
  type: string,
): T[] {
  return records.filter((r) => r.type === type && !r.spent) as T[];
}
