import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  privateKey: process.env.PRIVATE_KEY || '',
  operator2PrivateKey: process.env.OPERATOR2_PRIVATE_KEY || '',
  operator2Address: process.env.OPERATOR2_ADDRESS || '',
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
  darkpoolProgramId: 'dara_dp_credit_v5.aleo',
  dpBtcProgramId: 'dara_dp_btc_v5.aleo',
  dpEthProgramId: 'dara_dp_eth_v5.aleo',
  dpSolProgramId: 'dara_dp_sol_v5.aleo',
  testBtcProgramId: 'test_btc_v1.aleo',
  testEthProgramId: 'test_eth_v1.aleo',
  testSolProgramId: 'test_sol_v1.aleo',
  auctionProgramId: 'dara_auction_v1.aleo',
  flashProgramId: 'dara_flash_v1.aleo',
  precision: 1_000_000,

  // Database (PostgreSQL on Render)
  databaseUrl: process.env.DATABASE_URL || '',

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

export interface DarkPoolMarketConfig {
  id: string;
  label: string;
  programId: string;
  programAddress: string;       // on-chain program address (holds deposited funds)
  baseAsset: string;          // e.g. 'ALEO', 'BTC', 'ETH', 'SOL'
  quoteAsset: string;         // always 'USDCx'
  oracleSymbol: string;       // symbol for oracle fetchers
  tokenProgramId: string;     // base token program (credits.aleo or test_xxx_v1.aleo)
  tokenBalanceMapping: string; // mapping name for token balance ('account' for credits.aleo, 'balances' for others)
  precision: number;
  priceScale: number;         // divisor to fit real price into MAX_PRICE (100_000_000u64 = $100)
}

export const darkpoolMarkets: DarkPoolMarketConfig[] = [
  {
    id: 'aleo-usdcx',
    label: 'ALEO/USDCx',
    programId: config.darkpoolProgramId,
    programAddress: 'aleo1rt9w2lqxmg355zcps9mgj5w8h29a0f3960a0plmxdqyvh35mws9q9r7e6v',
    baseAsset: 'ALEO',
    quoteAsset: 'USDCx',
    oracleSymbol: 'ALEO',
    tokenProgramId: 'credits.aleo',
    tokenBalanceMapping: 'account',
    precision: 1_000_000,
    priceScale: 1,            // ALEO ~$0.50 fits within MAX_PRICE ($100)
  },
  {
    id: 'btc-usdcx',
    label: 'BTC/USDCx',
    programId: config.dpBtcProgramId,
    programAddress: 'aleo1wkp5l49p5k4vddlp8x7z9njlz0cp35veq6ph7evftta3us57rqrs5t4dny',
    baseAsset: 'BTC',
    quoteAsset: 'USDCx',
    oracleSymbol: 'BTC',
    tokenProgramId: config.testBtcProgramId,
    tokenBalanceMapping: 'balances',
    precision: 1_000_000,
    priceScale: 1000,         // BTC ~$100K / 1000 = $100 fits MAX_PRICE
  },
  {
    id: 'eth-usdcx',
    label: 'ETH/USDCx',
    programId: config.dpEthProgramId,
    programAddress: 'aleo1s4sl3xkqhw525r2mdlyzkecjuka79aa08n5fq886snvlceppng8sz6dyhw',
    baseAsset: 'ETH',
    quoteAsset: 'USDCx',
    oracleSymbol: 'ETH',
    tokenProgramId: config.testEthProgramId,
    tokenBalanceMapping: 'balances',
    precision: 1_000_000,
    priceScale: 100,          // ETH ~$2.5K / 100 = $25 fits MAX_PRICE
  },
  {
    id: 'sol-usdcx',
    label: 'SOL/USDCx',
    programId: config.dpSolProgramId,
    programAddress: 'aleo1r4phj4vm9x7cna5tnm95a4tmjev8q7ulumdvw7xhmedjn9u69vfq6qw54z',
    baseAsset: 'SOL',
    quoteAsset: 'USDCx',
    oracleSymbol: 'SOL',
    tokenProgramId: config.testSolProgramId,
    tokenBalanceMapping: 'balances',
    precision: 1_000_000,
    priceScale: 1,            // SOL ~$82 * 1M = 82M fits MAX_PRICE (100M) directly
  },
];
