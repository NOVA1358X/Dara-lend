import { buildAndBroadcastTransaction } from './utils/transactionBuilder.js';
import { config } from './utils/config.js';

const DELAY_MS = 35_000;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const ADMIN = config.adminAddress;

async function initAndSeedV5() {
  console.log('=== Initializing & Seeding v5 Dark Pools ===\n');
  
  const programs = [
    { id: 'dara_dp_btc_v5.aleo', symbol: 'BTC', price: '100000u64' },
    { id: 'dara_dp_eth_v5.aleo', symbol: 'ETH', price: '25000000u64' },
    { id: 'dara_dp_sol_v5.aleo', symbol: 'SOL', price: '15000000u64' },
  ];

  // Step 1: Initialize all programs (minimal — just sets initialized flag + admin)
  for (let i = 0; i < programs.length; i++) {
    const p = programs[i];
    console.log(`[Init ${i + 1}/${programs.length}] initialize on ${p.id}`);
    const tx = await buildAndBroadcastTransaction(
      p.id,
      'initialize',
      [ADMIN],
      500_000,
    );
    console.log(tx ? `  ✓ Init TX: ${tx}` : `  ✗ FAILED`);
    if (i < programs.length - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  console.log('\n--- Waiting before set_operators ---');
  await sleep(DELAY_MS);

  // Step 2: Set operators (admin is operators[0], set operators[1,2,3] = admin too)
  for (let i = 0; i < programs.length; i++) {
    const p = programs[i];
    console.log(`[Operators ${i + 1}/${programs.length}] set_operators on ${p.id}`);
    const tx = await buildAndBroadcastTransaction(
      p.id,
      'set_operators',
      [ADMIN, ADMIN, ADMIN],
      500_000,
    );
    console.log(tx ? `  ✓ Operators TX: ${tx}` : `  ✗ FAILED`);
    if (i < programs.length - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  console.log('\n--- Waiting before oracle seeding ---');
  await sleep(DELAY_MS);

  // Step 3: Seed oracle prices
  for (let i = 0; i < programs.length; i++) {
    const p = programs[i];
    console.log(`[Oracle ${i + 1}/${programs.length}] update_oracle_price on ${p.id} → ${p.price}`);
    const tx = await buildAndBroadcastTransaction(
      p.id,
      'update_oracle_price',
      [p.price, '1u64'],
      500_000,
    );
    console.log(tx ? `  ✓ Oracle TX: ${tx}` : `  ✗ FAILED`);
    if (i < programs.length - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  console.log('\n=== Done! All v5 programs initialized and seeded. ===');
}

initAndSeedV5().catch(err => { console.error('Failed:', err); process.exit(1); });
