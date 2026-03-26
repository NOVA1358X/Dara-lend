/**
 * One-time script: Seeds the vault's supply_pool_total to prevent division-by-zero
 * on the first deposit. The Leo compiler does not short-circuit ternary evaluation,
 * so `amount * shares / total` is computed even when shares == 0 and total == 0.
 *
 * This calls distribute_yield(token_type, 1u128) for both USDCx (0u8) and USAD (1u8),
 * which increments supply_pool_total from 0 to 1, making the division safe (0/1 = 0).
 *
 * Usage: npx tsx src/seedPool.ts
 */
import { buildAndBroadcastTransaction } from './utils/transactionBuilder.js';
import { config } from './utils/config.js';

const VAULT_PROGRAM = config.vaultProgramId;

async function seedPool() {
  console.log('Seeding vault pool to prevent division-by-zero...');
  console.log(`Vault program: ${VAULT_PROGRAM}`);
  console.log(`Admin: ${config.adminAddress}`);

  // Seed USDCx pool (token_type = 0u8)
  console.log('\n[1/2] distribute_yield(0u8, 1u128) — USDCx pool seed');
  const tx1 = await buildAndBroadcastTransaction(
    VAULT_PROGRAM,
    'distribute_yield',
    ['0u8', '1u128'],
    500_000,
  );
  if (tx1) {
    console.log(`  ✓ USDCx seed TX: ${tx1}`);
  } else {
    console.error('  ✗ USDCx seed failed');
  }

  // Wait 30s between transactions to avoid nonce conflicts
  console.log('\nWaiting 30s before next transaction...');
  await new Promise(r => setTimeout(r, 30_000));

  // Seed USAD pool (token_type = 1u8)
  console.log('[2/2] distribute_yield(1u8, 1u128) — USAD pool seed');
  const tx2 = await buildAndBroadcastTransaction(
    VAULT_PROGRAM,
    'distribute_yield',
    ['1u8', '1u128'],
    500_000,
  );
  if (tx2) {
    console.log(`  ✓ USAD seed TX: ${tx2}`);
  } else {
    console.error('  ✗ USAD seed failed');
  }

  console.log('\nDone! Both pools seeded. First deposits should now succeed.');
}

seedPool().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
