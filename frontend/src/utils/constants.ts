export const PROGRAM_ID = 'dara_lend_v1.aleo';
export const CREDITS_PROGRAM = 'credits.aleo';

export const ALEO_TESTNET_API = 'https://api.explorer.provable.com/v1/testnet';
export const BACKEND_API = '/api';

export const PRECISION = 1_000_000;
export const LTV_RATIO = 700_000;
export const LIQUIDATION_THRESHOLD = 800_000;
export const MIN_COLLATERAL = 100_000;
export const MICROCREDITS_PER_CREDIT = 1_000_000;

export const MAPPING_KEYS = {
  GLOBAL: '1field',
} as const;

export const MAPPINGS = {
  VAULT_TOTAL_COLLATERAL: 'vault_total_collateral',
  TOTAL_BORROWED: 'total_borrowed',
  LOAN_COUNT: 'loan_count',
  SOLVENCY_COMMITMENT: 'solvency_commitment',
  ORACLE_PRICE: 'oracle_price',
  USED_NONCES: 'used_nonces',
  PROTOCOL_ADMIN: 'protocol_admin',
  ACTIVE_LOANS: 'active_loans',
} as const;

export const TRANSITIONS = {
  INITIALIZE: 'initialize',
  UPDATE_ORACLE_PRICE: 'update_oracle_price',
  SUPPLY_COLLATERAL: 'supply_collateral',
  BORROW: 'borrow',
  REPAY: 'repay',
  LIQUIDATE: 'liquidate',
  WITHDRAW_COLLATERAL: 'withdraw_collateral',
} as const;

export const ROUTES = {
  HOME: '/',
  APP: '/app',
  SUPPLY: '/app/supply',
  BORROW: '/app/borrow',
  REPAY: '/app/repay',
  POSITIONS: '/app/positions',
  STATS: '/app/stats',
  DOCS: '/docs',
} as const;

export const TX_FEE = 500_000;

export const RECORD_TYPES = {
  COLLATERAL_RECEIPT: 'CollateralReceipt',
  DEBT_POSITION: 'DebtPosition',
  LIQUIDATION_AUTH: 'LiquidationAuth',
  REPAYMENT_RECEIPT: 'RepaymentReceipt',
  LIQUIDATION_RECEIPT: 'LiquidationReceipt',
} as const;

export const REFETCH_INTERVAL = 30_000;

export const COLORS = {
  ACCENT: '#00E5CC',
  BG_PRIMARY: '#080A12',
  TEXT_PRIMARY: '#F0F0F0',
  TEXT_SECONDARY: '#8A919E',
  TEXT_MUTED: '#4B5263',
  SUCCESS: '#34D399',
  WARNING: '#F59E0B',
  DANGER: '#EF4444',
} as const;
