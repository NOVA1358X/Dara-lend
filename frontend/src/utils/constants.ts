export const PROGRAM_ID = 'dara_lend_v8.aleo';
export const VAULT_PROGRAM_ID = 'dara_lend_v8_vault.aleo';
export const CREDITS_PROGRAM_ID = 'dara_lend_v8_credits.aleo';
export const GOV_PROGRAM_ID = 'dara_lend_v8_gov_v3.aleo';
export const DARKPOOL_PROGRAM_ID = 'dara_dark_pool_v3.aleo';
export const DP_BTC_PROGRAM_ID = 'dara_dp_btc_v4.aleo';
export const DP_ETH_PROGRAM_ID = 'dara_dp_eth_v4.aleo';
export const DP_SOL_PROGRAM_ID = 'dara_dp_sol_v4.aleo';
export const TEST_BTC_PROGRAM = 'test_btc_v1.aleo';
export const TEST_ETH_PROGRAM = 'test_eth_v1.aleo';
export const TEST_SOL_PROGRAM = 'test_sol_v1.aleo';
export const AUCTION_PROGRAM_ID = 'dara_auction_v1.aleo';
export const FLASH_PROGRAM_ID = 'dara_flash_v1.aleo';
export const CREDITS_PROGRAM = 'credits.aleo';
export const USDCX_PROGRAM = 'test_usdcx_stablecoin.aleo';
export const USAD_PROGRAM = 'test_usad_stablecoin.aleo';

export interface DarkPoolMarket {
  id: string;
  label: string;
  programId: string;
  baseAsset: string;
  quoteAsset: string;
  tokenProgramId: string;
  sellAmountType: string;   // 'u64' for all markets
  buyAmountType: string;    // 'u128' for USDCx
  priceScale: number;       // divisor: on-chain price × priceScale = real USD price
}

export const DARK_POOL_MARKETS: DarkPoolMarket[] = [
  {
    id: 'aleo-usdcx',
    label: 'ALEO/USDCx',
    programId: DARKPOOL_PROGRAM_ID,
    baseAsset: 'ALEO',
    quoteAsset: 'USDCx',
    tokenProgramId: CREDITS_PROGRAM,
    sellAmountType: 'u64',
    buyAmountType: 'u128',
    priceScale: 1,
  },
  {
    id: 'btc-usdcx',
    label: 'BTC/USDCx',
    programId: DP_BTC_PROGRAM_ID,
    baseAsset: 'BTC',
    quoteAsset: 'USDCx',
    tokenProgramId: TEST_BTC_PROGRAM,
    sellAmountType: 'u64',
    buyAmountType: 'u128',
    priceScale: 1000,
  },
  {
    id: 'eth-usdcx',
    label: 'ETH/USDCx',
    programId: DP_ETH_PROGRAM_ID,
    baseAsset: 'ETH',
    quoteAsset: 'USDCx',
    tokenProgramId: TEST_ETH_PROGRAM,
    sellAmountType: 'u64',
    buyAmountType: 'u128',
    priceScale: 100,
  },
  {
    id: 'sol-usdcx',
    label: 'SOL/USDCx',
    programId: DP_SOL_PROGRAM_ID,
    baseAsset: 'SOL',
    quoteAsset: 'USDCx',
    tokenProgramId: TEST_SOL_PROGRAM,
    sellAmountType: 'u64',
    buyAmountType: 'u128',
    priceScale: 10,
  },
];

export const ALEO_TESTNET_API = 'https://api.provable.com/v2/testnet';
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
// On-chain program addresses (deploy TX IDs below)
// Main: at1tn7vutm8dw3c9aknr66wxs8gz39r0lv2argnqkmclnxgauv4mc8sty74xg
// Vault: at1y0ghwhs6hdm5vr92pp3lcj442hvpgrytn87cpmp3nlyulaykg5pqurm94t
// Credits: at1h7q8lz544wsakfw3u3gtyqt7u0ynkhmkvvu9ay9hvl9dank5g5rsuq3cwp
// Gov: at13czejw57h7930qxhl28dpc57r49qqjjq7vt5muf73xjg40ed7vzqz2296d
export const PROTOCOL_ADDRESS = 'aleo1ngje2reufy2frsjhru4920ncn0spvlwr2s9vkthmvufa8arrqg9swmcn32';
export const CREDITS_PROTOCOL_ADDRESS = 'aleo1l42ej05k26xzc06y8yynasjqgnt6tq0c3k5ruwk35wlzqey29ypqfvhv0u';
export const VAULT_ADDRESS = 'aleo1w9j2fge5683q5mnldq5x8vuavnhnd6eweyfzvdg3cd9uvg3f4qxq6phlsq';
export const GOV_ADDRESS = 'aleo1jhyy6dtmsctfnca7dcv9tckyfxesnr4j9zv0qqqd6aummhnrj5xsh87huv';

export const DARKPOOL_ADDRESS = 'aleo1yrxw370zssfmulgk33c0hzm0asj6rqjc9dxdtt2v8t8y7x3ez5fqx8quh0';
export const FLASH_ADDRESS = 'aleo1n0p7h8mar8c7hn3upy3sz3l03zfhjj0zm07fcw37r6xk9zdpsu9qc4fkl4';

export const ADMIN_ADDRESS = 'aleo1fcvvertrnraperrdn7p048vlddlxpd89xszelsgyvwnfyxhmcc8skn2cs8';

export const MAPPING_KEYS = {
  GLOBAL: '0u8',
} as const;

export const MAPPINGS = {
  VAULT_COLLATERAL_ALEO: 'vault_collateral_aleo',
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
  RATE_SLOPE1_BPS: 'rate_slope1_bps',
  RATE_SLOPE2_BPS: 'rate_slope2_bps',
  RATE_OPTIMAL_UTIL: 'rate_optimal_util',
  LAST_ACCRUAL_BLOCK: 'last_accrual_block',
  SUPPLY_APY_BPS: 'supply_apy_bps',
  BORROW_APY_BPS: 'borrow_apy_bps',
  // Governance mappings (on GOV_PROGRAM_ID)
  GOVERNANCE_TOKEN_SUPPLY: 'governance_token_supply',
  PROPOSALS: 'proposals',
  PROPOSAL_VOTES: 'proposal_votes',
  PROPOSAL_EXECUTED: 'proposal_executed',
  PROPOSAL_COUNT: 'proposal_count',
  VOTING_POWER: 'voting_power',
} as const;

// Credits program mappings (CREDITS_PROGRAM_ID)
export const CREDITS_MAPPINGS = {
  VAULT_COLLATERAL_USDCX: 'vault_collateral_usdcx',
  VAULT_COLLATERAL_USAD: 'vault_collateral_usad',
  POOL_TOTAL_BORROWED: 'pool_total_borrowed',
  LOAN_COUNT: 'loan_count',
  ACTIVE_LOANS: 'active_loans',
  ORACLE_PRICE: 'oracle_price',
  PRICE_ROUND: 'price_round',
  CREDITS_ADMIN: 'credits_admin',
  CREDITS_PAUSED: 'credits_paused',
  TOTAL_FEES_COLLECTED: 'total_fees_collected',
} as const;

// Governance program mappings (GOV_PROGRAM_ID)
export const GOV_MAPPINGS = {
  GOV_ADMIN: 'gov_admin',
  GOVERNANCE_TOKEN_SUPPLY: 'governance_token_supply',
  PROPOSALS: 'proposals',
  PROPOSAL_VOTES: 'proposal_votes',
  PROPOSAL_EXECUTED: 'proposal_executed',
  PROPOSAL_COUNT: 'proposal_count',
  VOTING_POWER: 'voting_power',
  GOV_PAUSED: 'gov_paused',
  EXECUTION_RESULTS: 'execution_results',
  EXECUTION_COUNT: 'execution_count',
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
  // Stablecoin-collateral transitions live in CREDITS_PROGRAM_ID
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

// Governance transitions (GOV_PROGRAM_ID)
export const GOV_TRANSITIONS = {
  SET_LENDING_PROTOCOL: 'set_lending_protocol',
  MINT_GOVERNANCE_TOKENS: 'mint_governance_tokens',
  BURN_GOVERNANCE_TOKENS: 'burn_governance_tokens',
  CREATE_PROPOSAL: 'create_proposal',
  VOTE: 'vote',
  TALLY_VOTE: 'tally_vote',
  EXECUTE_PROPOSAL: 'execute_proposal',
  DELEGATE_VOTES: 'delegate_votes',
  UNDELEGATE_VOTES: 'undelegate_votes',
  SET_GOV_ADMIN: 'set_gov_admin',
  PAUSE_GOVERNANCE: 'pause_governance',
  RESUME_GOVERNANCE: 'resume_governance',
} as const;

// Precomputed BHP256::hash_to_field(index_u64) values for proposal IDs.
// These match exactly what the dara_lend_v8_gov contract stores as mapping keys.
// Computed via: leo run compute_proposal_id {n}u64
// Range: proposals 0-9 (10 proposals supported)
export const PROPOSAL_ID_TABLE: Record<number, string> = {
  0: '1652537219830374581351801133917453045132431561774681405210829109289309809653field',
  1: '3904538235078694782185823076632282886217961102128932463472941961302626985810field',
  2: '6166342214520700714293691441393595459819170509229148082349542888441470290697field',
  3: '2202382911525370664583268589701702089783227781579861903008538515875797617554field',
  4: '641191311826300068154926258315493886821689237038809166974400271680449809495field',
  5: '1384946382922025096738613590804518732490420771185259317319692407551559020642field',
  6: '4749267368329870819662397015074118545503495346847366781301881346274941963534field',
  7: '5909931256362643343842198150741641304168228616252145504784896873616588194458field',
  8: '6570036553036976211210420456848004756680832573481705515171701672060881289882field',
  9: '5020647010733192249898475765672489758623102564504821494353141994222324015394field',
};

// Credits program transitions (CREDITS_PROGRAM_ID)
export const CREDITS_TRANSITIONS = {
  UPDATE_ORACLE_PRICE: 'update_oracle_price',
  EMERGENCY_PAUSE: 'emergency_pause',
  RESUME_PROTOCOL: 'resume_protocol',
  SUPPLY_USDCX_COLLATERAL: 'supply_usdcx_collateral',
  SUPPLY_USAD_COLLATERAL: 'supply_usad_collateral',
  BORROW_CREDITS: 'borrow_credits',
  REPAY_CREDITS_USDCX: 'repay_credits_usdcx',
  REPAY_CREDITS_USAD: 'repay_credits_usad',
  LIQUIDATE_USDCX: 'liquidate_usdcx',
  LIQUIDATE_USAD: 'liquidate_usad',
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

// Dark Pool v2 transitions (DARKPOOL_PROGRAM_ID)
export const DARKPOOL_TRANSITIONS = {
  SET_OPERATORS: 'set_operators',
  UPDATE_ORACLE_PRICE: 'update_oracle_price',
  SUBMIT_BUY_ORDER: 'submit_buy_order',
  SUBMIT_SELL_ORDER: 'submit_sell_order',
  PROPOSE_SETTLEMENT: 'propose_settlement',
  APPROVE_SETTLEMENT: 'approve_settlement',
  EXECUTE_MATCH: 'execute_match',
  EXECUTE_PARTIAL_FILL: 'execute_partial_fill',
  RESUBMIT_RESIDUAL: 'resubmit_residual',
  CANCEL_BUY_ORDER: 'cancel_buy_order',
  CANCEL_SELL_ORDER: 'cancel_sell_order',
  ADVANCE_BATCH: 'advance_batch',
  WITHDRAW_FEES: 'withdraw_fees',
  SET_FEE_BPS: 'set_fee_bps',
  PAUSE_DARKPOOL: 'pause_darkpool',
  RESUME_DARKPOOL: 'resume_darkpool',
} as const;

// Dark Pool v2 mappings
export const DARKPOOL_MAPPINGS = {
  OPERATORS: 'operators',
  POOL_PAUSED: 'pool_paused',
  ORDER_CONSUMED: 'order_consumed',
  FEE_VAULT: 'fee_vault',
  FEE_BPS: 'fee_bps',
  TOTAL_TRADES: 'total_trades',
  TOTAL_VOLUME: 'total_volume',
  ORACLE_PRICE: 'oracle_price',
  ORACLE_ROUND: 'oracle_round',
  TWAP_CUM_PRICE: 'twap_cum_price',
  TWAP_CUM_COUNT: 'twap_cum_count',
  CURRENT_BATCH: 'current_batch',
  BATCH_APPROVED: 'batch_approved',
  BATCH_PROPOSED_PRICE: 'batch_proposed_price',
  BATCH_APPROVAL_COUNT: 'batch_approval_count',
} as const;

// Sealed-Bid Auction transitions (AUCTION_PROGRAM_ID)
export const AUCTION_TRANSITIONS = {
  START_AUCTION: 'start_auction',
  SUBMIT_SEALED_BID: 'submit_sealed_bid',
  REVEAL_BID: 'reveal_bid',
  SETTLE_AUCTION: 'settle_auction',
  CLAIM_COLLATERAL: 'claim_collateral',
  REDEEM_COLLATERAL: 'redeem_collateral',
  REFUND_BID: 'refund_bid',
  CANCEL_AUCTION: 'cancel_auction',
  PAUSE_AUCTIONS: 'pause_auctions',
  RESUME_AUCTIONS: 'resume_auctions',
} as const;

// Auction mappings
export const AUCTION_MAPPINGS = {
  AUCTION_ADMIN: 'auction_admin',
  AUCTION_PAUSED: 'auction_paused',
  AUCTION_COUNT: 'auction_count',
  AUCTIONS: 'auctions',
  AUCTION_SETTLED: 'auction_settled',
  AUCTION_CANCELLED: 'auction_cancelled',
  HIGHEST_BID: 'highest_bid',
  HIGHEST_BIDDER_HASH: 'highest_bidder_hash',
  BID_COUNT: 'bid_count',
  TOTAL_AUCTIONS: 'total_auctions',
  TOTAL_BID_VOLUME: 'total_bid_volume',
} as const;

// Precomputed BHP256::hash_to_field(n_u64) for auction IDs 0-9
// Same hash function as PROPOSAL_ID_TABLE (BHP256 on u64)
export const AUCTION_ID_TABLE: Record<number, string> = {
  0: '1652537219830374581351801133917453045132431561774681405210829109289309809653field',
  1: '3904538235078694782185823076632282886217961102128932463472941961302626985810field',
  2: '6166342214520700714293691441393595459819170509229148082349542888441470290697field',
  3: '2202382911525370664583268589701702089783227781579861903008538515875797617554field',
  4: '641191311826300068154926258315493886821689237038809166974400271680449809495field',
  5: '1384946382922025096738613590804518732490420771185259317319692407551559020642field',
  6: '4749267368329870819662397015074118545503495346847366781301881346274941963534field',
  7: '5909931256362643343842198150741641304168228616252145504784896873616588194458field',
  8: '6570036553036976211210420456848004756680832573481705515171701672060881289882field',
  9: '5020647010733192249898475765672489758623102564504821494353141994222324015394field',
};

// Flash Loan transitions (FLASH_PROGRAM_ID)
export const FLASH_TRANSITIONS = {
  UPDATE_ORACLE_PRICE: 'update_oracle_price',
  FLASH_BORROW_USDCX: 'flash_borrow_usdcx',
  FLASH_CLAIM_USDCX: 'flash_claim_usdcx',
  FLASH_REPAY_USDCX: 'flash_repay_usdcx',
  FLASH_WITHDRAW_ALEO: 'flash_withdraw_aleo',
  FLASH_BORROW_ALEO: 'flash_borrow_aleo',
  FLASH_CLAIM_ALEO: 'flash_claim_aleo',
  FLASH_REPAY_ALEO: 'flash_repay_aleo',
  FLASH_WITHDRAW_USDCX: 'flash_withdraw_usdcx',
  PAUSE_FLASH: 'pause_flash',
  RESUME_FLASH: 'resume_flash',
} as const;

// Flash Loan mappings
export const FLASH_MAPPINGS = {
  FLASH_ADMIN: 'flash_admin',
  FLASH_PAUSED: 'flash_paused',
  ORACLE_PRICE: 'oracle_price',
  TOTAL_FLASH_LOANS: 'total_flash_loans',
  TOTAL_FLASH_VOLUME: 'total_flash_volume',
  TOTAL_FEES_EARNED: 'total_fees_earned',
  ACTIVE_FLASH_COUNT: 'active_flash_count',
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
  GOVERNANCE: '/app/governance',
  RATES: '/app/rates',
  DARKPOOL: '/app/darkpool',
  AUCTIONS: '/app/auctions',
  FLASH: '/app/flash',
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
  // Governance (GOV_PROGRAM_ID)
  GOVERNANCE_TOKEN: 'GovernanceToken',
  PROPOSAL_RECEIPT: 'ProposalReceipt',
  DELEGATION_RECEIPT: 'DelegationReceipt',
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
