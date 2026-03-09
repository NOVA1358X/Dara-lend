export const PROGRAM_ID = 'dara_lend_v3.aleo';
export const CREDITS_PROGRAM = 'credits.aleo';

export const ALEO_TESTNET_API = 'https://api.explorer.provable.com/v1/testnet';
export const BACKEND_API = '/api';

export const PRECISION = 1_000_000;
export const LTV_RATIO = 700_000;
export const LIQUIDATION_THRESHOLD = 800_000;
export const MIN_COLLATERAL = 100_000;
export const MICROCREDITS_PER_CREDIT = 1_000_000;

export const USDCX_PROGRAM = 'test_usdcx_stablecoin.aleo';

// The on-chain address of dara_lend_v3.aleo (derived deterministically from program ID)
export const PROTOCOL_ADDRESS = 'aleo1qg44nuy7y9pshqcapw67w8mcye23s3mh7dl2ze8lw9m9yg0fqvzs2f94nn';

// Protocol admin address (set during contract deployment)
export const ADMIN_ADDRESS = 'aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8';

export const MAPPING_KEYS = {
  GLOBAL: '0u8',
} as const;

export const MAPPINGS = {
  VAULT_TOTAL_COLLATERAL: 'vault_total_collateral',
  TOTAL_BORROWED: 'total_borrowed',
  LOAN_COUNT: 'loan_count',
  ORACLE_PRICE: 'oracle_price',
  PRICE_UPDATE_BLOCK: 'price_update_block',
  USED_NONCES: 'used_nonces',
  PROTOCOL_ADMIN: 'protocol_admin',
  ACTIVE_LOANS: 'active_loans',
  TOTAL_FEES_COLLECTED: 'total_fees_collected',
} as const;

export const TRANSITIONS = {
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
  WITHDRAW: '/app/withdraw',
  LIQUIDATE: '/app/liquidate',
  STATS: '/app/stats',
  DOCS: '/docs',
} as const;

export const TX_FEE = 500_000;
export const TX_FEE_HIGH = 1_000_000; // Higher fee for complex private transfers

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
