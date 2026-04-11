/**
 * One-time script: Seeds the 3 new dark pool markets (BTC, ETH, SOL)
 *
 * 1. Mints test tokens (BTC, ETH, SOL) for admin — 1,000 each at 6 decimals
 * 2. Pushes initial oracle prices to each dark pool contract
 *
 * The constructor already set:
 *   - operators[0..3] = admin
 *   - fee_bps = 5 (0.05%)
 *   - oracle_price = 0 (needs initial push)
 *
 * Usage: npx tsx src/seedNewMarkets.ts
 */
import { buildAndBroadcastTransaction } from './utils/transactionBuilder.js';
import { config } from './utils/config.js';

const ADMIN = config.adminAddress;
const DELAY_MS = 35_000; // wait between TXs to avoid nonce conflicts

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function seedNewMarkets() {
  console.log('=== Seeding New Dark Pool Markets ===');
  console.log(`Admin: ${ADMIN}`);
  console.log('');

  // ─── Step 1: Mint test tokens ───
  const mints = [
    { program: config.testBtcProgramId, symbol: 'BTC', amount: '1000000000u64' }, // 1,000 BTC (6 dec)
    { program: config.testEthProgramId,  symbol: 'ETH', amount: '1000000000u64' }, // 1,000 ETH (6 dec)
    { program: config.testSolProgramId,  symbol: 'SOL', amount: '1000000000u64' }, // 1,000 SOL (6 dec)
  ];

  for (let i = 0; i < mints.length; i++) {
    const m = mints[i];
    console.log(`[${i + 1}/3] mint_public on ${m.program} → ${m.amount} ${m.symbol}`);
    const tx = await buildAndBroadcastTransaction(
      m.program,
      'mint_public',
      [ADMIN, m.amount],
      500_000,
    );
    if (tx) {
      console.log(`  ✓ ${m.symbol} mint TX: ${tx}`);
    } else {
      console.error(`  ✗ ${m.symbol} mint failed`);
    }

    if (i < mints.length - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  console.log('');
  console.log('Waiting before oracle price pushes...');
  await sleep(DELAY_MS);

  // ─── Step 2: Push initial oracle prices ───
  // Prices in u64 with 6-decimal precision, scaled to fit MAX_PRICE (100_000_000u64)
  // BTC ~$100K / 1000 = 100_000u64 | ETH ~$2.5K / 100 = 25_000_000u64 | SOL ~$150 / 10 = 15_000_000u64
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

  console.log('');
  console.log('=== Done! All 3 markets seeded. ===');
  console.log('  ✓ BTC, ETH, SOL tokens minted for admin');
  console.log('  ✓ Initial oracle prices pushed to all 3 dark pools');
  console.log('  ✓ fee_bps already set to 5 by constructor');
  console.log('  ✓ Operators already set to admin by constructor');
}

seedNewMarkets().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
