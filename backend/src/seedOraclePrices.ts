/**
 * Push initial oracle prices to the 3 new dark pool markets.
 * Run after seedNewMarkets.ts minted the test tokens.
 *
 * Usage: npx tsx src/seedOraclePrices.ts
 */
import { buildAndBroadcastTransaction } from './utils/transactionBuilder.js';
import { config } from './utils/config.js';

const DELAY_MS = 35_000;

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function seedOraclePrices() {
  console.log('=== Pushing Initial Oracle Prices ===\n');

  // Prices in u64 with 6-decimal precision, scaled to fit MAX_PRICE (100_000_000u64 = $100)
  // BTC ~$100,000 / 1000 scale = 100_000u64 (= $0.10 in contract, represents $100K)
  // ETH ~$2,500 / 100 scale = 25_000_000u64 (= $25 in contract, represents $2.5K)
  // SOL ~$150 / 10 scale = 15_000_000u64 (= $15 in contract, represents $150)
  const pricePushes = [
    { program: config.dpBtcProgramId, symbol: 'BTC', price: '100000u64',    round: '1u64' },
    { program: config.dpEthProgramId, symbol: 'ETH', price: '25000000u64',  round: '1u64' },
    { program: config.dpSolProgramId, symbol: 'SOL', price: '15000000u64',  round: '1u64' },
  ];

  for (let i = 0; i < pricePushes.length; i++) {
    const p = pricePushes[i];
    console.log(`[${i + 1}/3] update_oracle_price on ${p.program} → ${p.price} (${p.symbol})`);
    const tx = await buildAndBroadcastTransaction(
      p.program,
      'update_oracle_price',
      [p.price, p.round],
      500_000,
    );
    if (tx) {
      console.log(`  ✓ ${p.symbol} oracle TX: ${tx}`);
    } else {
      console.error(`  ✗ ${p.symbol} oracle push failed`);
    }

    if (i < pricePushes.length - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  console.log('\n=== Done! All 3 oracle prices seeded. ===');
}

seedOraclePrices().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
