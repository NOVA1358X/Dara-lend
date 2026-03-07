import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  privateKey: process.env.PRIVATE_KEY || '',
  adminAddress: process.env.ADMIN_ADDRESS || '',
  aleoRpcUrl: process.env.ALEO_RPC_URL || 'https://api.explorer.provable.com/v1/testnet',
  coingeckoApiUrl: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
  programId: 'dara_lend_v1.aleo',
  precision: 1_000_000,
  oracleUpdateCron: '*/5 * * * *',
  priceChangeThreshold: 0.001,
} as const;
