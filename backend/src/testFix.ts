/**
 * Verify the oracle fix: push a DIFFERENT price to dara_dp_btc_v2.
 * Old contracts: different-price push REJECTED (sub underflow in finalize).
 * New contracts: should be ACCEPTED (safe abs-diff pattern).
 */
import { buildAndBroadcastTransaction } from './utils/transactionBuilder.js';

async function testFix() {
  console.log('=== FIX VERIFICATION: Push different price to dara_dp_btc_v2 ===');
  console.log('Old contracts: different-price push was REJECTED (sub underflow)');
  console.log('New contracts: should be ACCEPTED (safe abs-diff)\n');
  console.log('Current on-chain price: 100001u64 (round 2)');
  console.log('Pushing 100005u64 (round 3) — a DIFFERENT price...\n');

  const tx = await buildAndBroadcastTransaction(
    'dara_dp_btc_v2.aleo',
    'update_oracle_price',
    ['100005u64', '3u64'],
    500_000,
  );
  console.log('TX ID:', tx);

  // Wait for confirmation
  console.log('Waiting 20s for on-chain confirmation...');
  await new Promise(r => setTimeout(r, 20000));

  const resp = await fetch(`https://api.explorer.provable.com/v1/testnet/transaction/${tx}`);
  const data: any = await resp.json();
  console.log('\nTX TYPE:', data.type);

  if (data.type === 'execute') {
    console.log('✅ FIX CONFIRMED! Different-price oracle update ACCEPTED!');
    console.log('The Leo ternary sub-underflow bug is FIXED.');
  } else {
    console.log('❌ Still rejected — type:', data.type);
  }
}

testFix().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
