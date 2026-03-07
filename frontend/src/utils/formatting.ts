import { MICROCREDITS_PER_CREDIT, PRECISION } from './constants';

export function formatCredits(microcredits: number | bigint | string): string {
  const value = typeof microcredits === 'string'
    ? parseFloat(microcredits)
    : Number(microcredits);
  if (isNaN(value)) return '—';
  return (value / MICROCREDITS_PER_CREDIT).toFixed(2);
}

export function formatCreditsLong(microcredits: number | bigint | string): string {
  const value = typeof microcredits === 'string'
    ? parseFloat(microcredits)
    : Number(microcredits);
  if (isNaN(value)) return '—';
  return (value / MICROCREDITS_PER_CREDIT).toFixed(6);
}

export function truncateAddress(address: string, startLen = 6, endLen = 4): string {
  if (!address || address.length < startLen + endLen + 3) return address || '—';
  return `${address.slice(0, startLen)}...${address.slice(-endLen)}`;
}

export function formatPercentage(value: number, decimals = 2): string {
  if (isNaN(value)) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatPrecisionValue(value: number): number {
  return value / PRECISION;
}

export function formatUSD(value: number): string {
  if (isNaN(value)) return '—';
  return `$${value.toFixed(2)}`;
}

export function formatField(field: string): string {
  if (!field) return '—';
  const clean = field.replace('field', '').replace('.public', '').replace('.private', '');
  if (clean.length <= 12) return clean;
  return `${clean.slice(0, 8)}...${clean.slice(-4)}`;
}

export function parseAleoU64(value: string): number {
  if (!value) return 0;
  const cleaned = value
    .replace('u64', '')
    .replace('u128', '')
    .replace('.public', '')
    .replace('.private', '')
    .replace(/"/g, '')
    .trim();
  return parseInt(cleaned, 10) || 0;
}

export function parseAleoField(value: string): string {
  if (!value) return '';
  return value
    .replace('field', '')
    .replace('.public', '')
    .replace('.private', '')
    .replace(/"/g, '')
    .trim();
}

export function parseAleoAddress(value: string): string {
  if (!value) return '';
  return value
    .replace('.public', '')
    .replace('.private', '')
    .replace(/"/g, '')
    .trim();
}

export function microCreditsToInput(amount: number): string {
  return `${amount}u64`;
}

export function microCreditsToU128Input(amount: number): string {
  return `${amount}u128`;
}

export function fieldToInput(value: string | number): string {
  const v = String(value).replace('field', '');
  return `${v}field`;
}

export function addressToInput(address: string): string {
  return address;
}

export function calculateHealthFactor(
  collateralAmount: number,
  debtAmount: number,
  oraclePrice: number,
): number {
  if (debtAmount === 0) return Infinity;
  const collateralValue = (collateralAmount * oraclePrice) / PRECISION;
  const liquidationThreshold = 800_000;
  const maxDebt = (collateralValue * liquidationThreshold) / PRECISION;
  return maxDebt / debtAmount;
}

export function calculateMaxBorrow(collateralAmount: number): number {
  return Math.floor((collateralAmount * 700_000) / PRECISION);
}

export function calculateLiquidationPrice(
  debtAmount: number,
  collateralAmount: number,
): number {
  const collateralAtThreshold = (collateralAmount * 800_000) / PRECISION;
  if (collateralAtThreshold === 0) return 0;
  return Math.ceil((debtAmount * PRECISION) / collateralAtThreshold);
}

export function generateAddressColor(address: string): string {
  if (!address) return '#4B5263';
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 60%, 55%)`;
}

export function formatNumber(value: number): string {
  if (isNaN(value)) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}
