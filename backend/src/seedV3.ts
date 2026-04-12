import { buildAndBroadcastTransaction } from './utils/transactionBuilder.js';
import { config } from './utils/config.js';

const DELAY_MS = 35_000;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function seedV3() {
  console.log('=== Seeding v3 Dark Pool Oracle Prices ===\n');
  const markets = [
    { program: config.dpBtcProgramId, symbol: 'BTC', price: '100000u64', round: '1u64' },
    { program: config.dpEthProgramId, symbol: 'ETH', price: '25000000u64', round: '1u64' },
    { program: config.dpSolProgramId, symbol: 'SOL', price: '15000000u64', round: '1u64' },
  ];

  for (let i = 0; i < markets.length; i++) {
    const m = markets[i];
    console.log(`[${i + 1}/${markets.length}] update_oracle_price on ${m.program} → ${m.price} (${m.symbol})`);
    const tx = await buildAndBroadcastTransaction(m.program, 'update_oracle_price', [m.price, m.round], 500_000);
    console.log(tx ? `  ✓ ${m.symbol} TX: ${tx}` : `  ✗ ${m.symbol} FAILED`);
    if (i < markets.length - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }
  console.log('\n=== Done! ===');
}

seedV3().catch(err => { console.error('Seed failed:', err); process.exit(1); });
