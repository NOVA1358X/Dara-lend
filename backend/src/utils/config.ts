import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  privateKey: process.env.PRIVATE_KEY || '',
  adminAddress: process.env.ADMIN_ADDRESS || '',
  aleoRpcUrl: process.env.ALEO_RPC_URL || 'https://api.provable.com/v2',
  aleoApiUrl: (process.env.ALEO_RPC_URL || 'https://api.provable.com/v2') + '/testnet',
  coingeckoApiUrl: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
  cmcApiKey: process.env.CMC_API_KEY || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  programId: 'dara_lend_v8.aleo',
  vaultProgramId: 'dara_lend_v8_vault.aleo',
  creditsProgramId: 'dara_lend_v8_credits.aleo',
  govProgramId: 'dara_lend_v8_gov_v3.aleo',
  darkpoolProgramId: 'dara_dark_pool_v1.aleo',
  auctionProgramId: 'dara_auction_v1.aleo',
  flashProgramId: 'dara_flash_v1.aleo',
  precision: 1_000_000,
  oracleUpdateCron: '*/2 * * * *',
  priceChangeThreshold: 0.001,

  // Provable Delegated Proving Service
  provableApiKey: process.env.PROVABLE_API_KEY || '',
  provableConsumerId: process.env.PROVABLE_CONSUMER_ID || '',
  provableDpsUrl: process.env.PROVABLE_DPS_URL || 'https://api.provable.com/prove/testnet',
  useFeeMaster: process.env.USE_FEE_MASTER !== 'false',
  dpsEnabled: process.env.DPS_ENABLED === 'true',

  // Bot orchestrator
  botEnabled: process.env.BOT_ENABLED === 'true',
  botTickInterval: parseInt(process.env.BOT_TICK_INTERVAL || '60000', 10),          // 1 min tick
  oraclePushCooldown: parseInt(process.env.ORACLE_PUSH_COOLDOWN || '1800000', 10),  // 30 min
  oracleStaleThreshold: parseInt(process.env.ORACLE_STALE_THRESHOLD || '1800000', 10), // 30 min
  interestAccrualInterval: parseInt(process.env.INTEREST_ACCRUAL_INTERVAL || '3600000', 10), // 1 hr
  yieldDistributionInterval: parseInt(process.env.YIELD_DISTRIBUTION_INTERVAL || '21600000', 10), // 6 hr
  yieldDistributionMinAmount: parseInt(process.env.YIELD_MIN_AMOUNT || '10000', 10), // 0.01 token
} as const;
