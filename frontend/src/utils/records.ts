import { RECORD_TYPES } from './constants';
import { parseAleoU64, parseAleoField, parseAleoAddress } from './formatting';

export interface CollateralReceiptRecord {
  type: typeof RECORD_TYPES.COLLATERAL_RECEIPT;
  owner: string;
  collateralAmount: number;
  depositBlock: number;
  nonceHash: string;
  plaintext: string;
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
  plaintext: string;
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
  plaintext: string;
  raw: Record<string, unknown>;
  spent: boolean;
}

export interface RepaymentReceiptRecord {
  type: typeof RECORD_TYPES.REPAYMENT_RECEIPT;
  owner: string;
  amountRepaid: number;
  collateralReturned: number;
  loanId: string;
  plaintext: string;
  raw: Record<string, unknown>;
  spent: boolean;
}

export interface LiquidationReceiptRecord {
  type: typeof RECORD_TYPES.LIQUIDATION_RECEIPT;
  owner: string;
  loanId: string;
  collateralSeized: number;
  debtCovered: number;
  plaintext: string;
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
  data?: Record<string, unknown>;
  spent?: boolean;
  plaintext?: string;
  recordPlaintext?: string;
  programId?: string;
  program_id?: string;
  functionName?: string;
  recordName?: string;
  recordCiphertext?: string;
  owner?: string;
  nonce?: string;
  // Shield may return fields at top level
  [key: string]: unknown;
}

/**
 * Parse an Aleo plaintext record string into key-value fields.
 * Handles formats like:
 *   { owner: aleo1...private, collateral_amount: 1000000u64.private, ... }
 */
export function parsePlaintextFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const inner = text.replace(/^\s*\{/, '').replace(/\}\s*$/, '');
  const parts = inner.includes('\n') ? inner.split('\n') : inner.split(',');
  for (const part of parts) {
    const trimmed = part.trim().replace(/,\s*$/, '');
    if (!trimmed) continue;
    const match = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
    if (match) {
      fields[match[1]] = match[2].trim();
    }
  }
  return fields;
}

/**
 * Coerce a Shield data value to a string.
 * Handles: string values, objects with .value property, numbers, booleans.
 */
function coerceDataValue(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'bigint') return String(val);
  if (typeof val === 'boolean') return String(val);
  if (val && typeof val === 'object') {
    // Shield may wrap values as { value: "1000000u64" } or similar
    const obj = val as Record<string, unknown>;
    if ('value' in obj && obj.value != null) return String(obj.value);
    // Try toString
    const str = String(val);
    if (str !== '[object Object]') return str;
  }
  return '';
}

function extractFields(record: RawAleoRecord): Record<string, string> {
  // 1. Try recordPlaintext (Shield format) or plaintext (from decrypt)
  const pt = record.recordPlaintext || record.plaintext;
  if (pt && typeof pt === 'string') {
    const fields = parsePlaintextFields(pt);
    if (Object.keys(fields).length > 1) return fields;
  }

  // 2. Try record.data with robust value coercion
  if (record.data && typeof record.data === 'object') {
    const fields: Record<string, string> = {};
    for (const [key, val] of Object.entries(record.data)) {
      if (val === undefined || val === null) continue;
      const str = coerceDataValue(val);
      if (str) fields[key] = str;
    }
    // Need at least one non-owner, non-nonce field
    const meaningful = Object.keys(fields).filter(k => k !== 'owner' && k !== '_nonce');
    if (meaningful.length > 0) return fields;
  }

  // 3. Try top-level fields (some adapters put fields directly on the record)
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

export function parseRecord(rawRecord: Record<string, unknown>, decryptedPlaintext?: string): DaraRecord | null {
  const record = rawRecord as unknown as RawAleoRecord;
  
  // If we have decrypted plaintext, inject it into the record for extraction
  if (decryptedPlaintext && !record.plaintext) {
    record.plaintext = decryptedPlaintext;
  }
  
  const fields = extractFields(record);
  const recordType = detectRecordType(fields, record);
  const spent = record.spent ?? false;
  // Prefer recordPlaintext (Shield native) over plaintext (from decrypt)
  const plaintext = record.recordPlaintext || record.plaintext || '';

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
        plaintext,
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
        plaintext,
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
        plaintext,
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
        plaintext,
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
        plaintext,
        raw: rawRecord,
        spent,
      };

    default:
      return null;
  }
}

const CONSUMED_KEY = 'dara_consumed_records';

function getConsumedSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(CONSUMED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function markRecordConsumed(commitment: string): void {
  const set = getConsumedSet();
  set.add(commitment);
  sessionStorage.setItem(CONSUMED_KEY, JSON.stringify([...set]));
}

function getRecordCommitment(record: DaraRecord): string {
  const raw = record.raw;
  return (raw.commitment as string) || (raw.tag as string) || '';
}

export function filterRecordsByType<T extends DaraRecord>(
  records: DaraRecord[],
  type: string,
): T[] {
  const consumed = getConsumedSet();
  return records.filter((r) => {
    if (r.type !== type || r.spent) return false;
    const id = getRecordCommitment(r);
    return !id || !consumed.has(id);
  }) as T[];
}
