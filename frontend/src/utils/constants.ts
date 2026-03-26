export const PROGRAM_ID = 'dara_lend_v7.aleo';
export const VAULT_PROGRAM_ID = 'dara_lend_v7_vault.aleo';
export const CREDITS_PROGRAM = 'credits.aleo';
export const USDCX_PROGRAM = 'test_usdcx_stablecoin.aleo';
export const USAD_PROGRAM = 'test_usad_stablecoin.aleo';

export const ALEO_TESTNET_API = 'https://api.explorer.provable.com/v1/testnet';
export const BACKEND_API = import.meta.env.VITE_BACKEND_URL || '/api';

export const PRECISION = 1_000_000;
export const LTV_RATIO = 700_000;
export const LIQUIDATION_THRESHOLD = 800_000;
export const MIN_COLLATERAL = 100_000;
export const MIN_COLLATERAL_STABLE = 100_000;
export const MICROCREDITS_PER_CREDIT = 1_000_000;

// Token type identifiers matching contract constants
export const TOKEN_TYPES = {
  ALEO: 0,
  USDCX: 1,
  USAD: 2,
} as const;

export const TOKEN_LABELS: Record<number, string> = {
  0: 'ALEO',
  1: 'USDCx',
  2: 'USAD',
};

// The on-chain address of the deployed programs
export const PROTOCOL_ADDRESS = 'aleo17900g0qun6jqan677l8nhjht3ffyd94fl36w9ys8lwp9w4eklc8sd5ls3g';
export const VAULT_ADDRESS = 'aleo1mgv9tv2a6vcm6n0m3hq58manlmwcr73yjynluuwq4tk966v8mvzqfvcehz';

export const ADMIN_ADDRESS = 'aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8';

export const MAPPING_KEYS = {
  GLOBAL: '0u8',
} as const;

export const MAPPINGS = {
  VAULT_COLLATERAL_ALEO: 'vault_collateral_aleo',
  VAULT_COLLATERAL_USDCX: 'vault_collateral_usdcx',
  VAULT_COLLATERAL_USAD: 'vault_collateral_usad',
  POOL_TOTAL_BORROWED: 'pool_total_borrowed',
  LOAN_COUNT: 'loan_count',
  ORACLE_PRICE: 'oracle_price',
  PRICE_UPDATE_BLOCK: 'price_update_block',
  USED_NONCES: 'used_nonces',
  PROTOCOL_ADMIN: 'protocol_admin',
  ACTIVE_LOANS: 'active_loans',
  TOTAL_FEES_COLLECTED: 'total_fees_collected',
  PRICE_ROUND: 'price_round',
  PRICE_HISTORY: 'price_history',
  PROTOCOL_PAUSED: 'protocol_paused',
  PRIVACY_VERSION: 'privacy_version',
  RATE_BASE_BPS: 'rate_base_bps',
  RATE_SLOPE_BPS: 'rate_slope_bps',
  LAST_ACCRUAL_BLOCK: 'last_accrual_block',
  SUPPLY_APY_BPS: 'supply_apy_bps',
  BORROW_APY_BPS: 'borrow_apy_bps',
} as const;

// Vault program mappings
export const VAULT_MAPPINGS = {
  SUPPLY_POOL_TOTAL: 'supply_pool_total',
  SUPPLY_POOL_SHARES: 'supply_pool_shares',
  POOL_YIELD_ACCUMULATED: 'pool_yield_accumulated',
  VAULT_ADMIN: 'vault_admin',
  VAULT_PAUSED: 'vault_paused',
  TRANSFER_COUNT: 'transfer_count',
  TOTAL_VOLUME: 'total_volume',
  POOL_DEPOSIT_COUNT: 'pool_deposit_count',
  POOL_TVL_USDCX: 'pool_tvl_usdcx',
  POOL_TVL_USAD: 'pool_tvl_usad',
} as const;

export const TRANSITIONS = {
  UPDATE_ORACLE_PRICE: 'update_oracle_price',
  SET_RATE_PARAMS: 'set_rate_params',
  EMERGENCY_PAUSE: 'emergency_pause',
  RESUME_PROTOCOL: 'resume_protocol',
  ACCRUE_INTEREST: 'accrue_interest',
  SUPPLY_COLLATERAL: 'supply_collateral',
  SUPPLY_USDCX_COLLATERAL: 'supply_usdcx_collateral',
  SUPPLY_USAD_COLLATERAL: 'supply_usad_collateral',
  BORROW: 'borrow',
  BORROW_USAD: 'borrow_usad',
  BORROW_CREDITS: 'borrow_credits',
  REPAY: 'repay',
  REPAY_USAD: 'repay_usad',
  REPAY_CREDITS_USDCX: 'repay_credits_usdcx',
  REPAY_CREDITS_USAD: 'repay_credits_usad',
  LIQUIDATE: 'liquidate',
  LIQUIDATE_USDCX: 'liquidate_usdcx',
  LIQUIDATE_USAD: 'liquidate_usad',
  WITHDRAW_COLLATERAL: 'withdraw_collateral',
  WITHDRAW_USDCX_COLLATERAL: 'withdraw_usdcx_collateral',
  WITHDRAW_USAD_COLLATERAL: 'withdraw_usad_collateral',
} as const;

// Vault program transitions
export const VAULT_TRANSITIONS = {
  PROVIDE_USDCX_CAPITAL: 'provide_usdcx_capital',
  PROVIDE_USAD_CAPITAL: 'provide_usad_capital',
  REDEEM_USDCX_CAPITAL: 'redeem_usdcx_capital',
  REDEEM_USAD_CAPITAL: 'redeem_usad_capital',
  DISTRIBUTE_YIELD: 'distribute_yield',
  PRIVATE_TRANSFER_USDCX: 'private_transfer_usdcx',
  PRIVATE_TRANSFER_USAD: 'private_transfer_usad',
  SET_VAULT_ADMIN: 'set_vault_admin',
  PAUSE_VAULT: 'pause_vault',
  RESUME_VAULT: 'resume_vault',
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
  ANALYTICS: '/app/analytics',
  YIELD: '/app/yield',
  TRANSFER: '/app/transfer',
  DOCS: '/docs',
} as const;

export const TX_FEE = 500_000;
export const TX_FEE_HIGH = 1_000_000;

export const RECORD_TYPES = {
  COLLATERAL_RECEIPT: 'CollateralReceipt',
  DEBT_POSITION: 'DebtPosition',
  LIQUIDATION_AUTH: 'LiquidationAuth',
  REPAYMENT_RECEIPT: 'RepaymentReceipt',
  LIQUIDATION_RECEIPT: 'LiquidationReceipt',
} as const;

export const REFETCH_INTERVAL = 30_000;

export const COLORS = {
  PRIMARY: '#C9DDFF',
  SECONDARY: '#D6C5A1',
  BG_PRIMARY: '#000000',
  TEXT_PRIMARY: '#E2E2E2',
  TEXT_SECONDARY: '#999999',
  TEXT_MUTED: '#666666',
  SUCCESS: '#34D399',
  WARNING: '#F59E0B',
  DANGER: '#EF4444',
} as const;
