/**
 * Test script to confirm the dark pool oracle rejection root cause.
 * 
 * Theory: Leo compiler eagerly evaluates BOTH branches of:
 *   let diff = new_price > last_price ? new_price - last_price : last_price - new_price;
 * 
 * This compiles to TWO sub instructions, one of which always underflows
 * when new_price ≠ last_price, causing finalize rejection.
 * 
 * Test: Push the SAME price (diff=0, both subs = 0) at round+1.
 * If this succeeds, the underflow theory is confirmed.
 * 
 * Usage: npx tsx src/testOracleTheory.ts
 */
import { buildAndBroadcastTransaction } from './utils/transactionBuilder.js';
import { getMappingValue, parseAleoU64 } from './utils/aleoClient.js';
import { config } from './utils/config.js';

async function testSamePricePush() {
  const programId = config.dpBtcProgramId; // dara_dp_btc_v1.aleo
  console.log(`\n=== Testing Oracle Underflow Theory ===`);
  console.log(`Program: ${programId}`);

  // Read current on-chain state
  const [priceRaw, roundRaw] = await Promise.all([
    getMappingValue('oracle_price', '0u8', programId),
    getMappingValue('oracle_round', '0u8', programId),
  ]);

  const currentPrice = parseAleoU64(priceRaw);
  const currentRound = parseAleoU64(roundRaw);
  console.log(`Current on-chain price: ${currentPrice}u64`);
  console.log(`Current on-chain round: ${currentRound}u64`);

  const nextRound = currentRound + 1;

  // TEST 1: Push SAME price (diff=0, both subs produce 0 → should SUCCEED)
  console.log(`\n[TEST 1] Pushing SAME price ${currentPrice}u64 at round ${nextRound}`);
  console.log(`  Both subs: ${currentPrice} - ${currentPrice} = 0 (no underflow)`);

  const tx1 = await buildAndBroadcastTransaction(
    programId,
    'update_oracle_price',
    [`${currentPrice}u64`, `${nextRound}u64`],
    500_000,
  );

  if (tx1) {
    console.log(`  ✅ SAME PRICE TX ACCEPTED: ${tx1}`);
    console.log(`  This confirms the finalize logic works when diff=0.`);
  } else {
    console.log(`  ❌ SAME PRICE TX FAILED (unexpected — may be DPS issue)`);
    return;
  }

  // Wait for confirmation
  console.log(`\nWaiting 45s for TX confirmation before test 2...`);
  await new Promise(r => setTimeout(r, 45_000));

  // Verify round advanced
  const roundRaw2 = await getMappingValue('oracle_round', '0u8', programId);
  const newRound = parseAleoU64(roundRaw2);
  console.log(`On-chain round after test 1: ${newRound}u64`);

  if (newRound <= currentRound) {
    console.log(`  Round didn't advance — TX may still be pending or was rejected`);
    console.log(`  Check: https://testnet.aleo.info/transaction/${tx1}`);
    return;
  }

  // TEST 2: Push DIFFERENT price (diff≠0, one sub underflows → should FAIL/REJECT)
  const differentPrice = currentPrice + 1; // Just 1 unit different
  const nextRound2 = newRound + 1;
  console.log(`\n[TEST 2] Pushing DIFFERENT price ${differentPrice}u64 at round ${nextRound2}`);
  console.log(`  sub ${differentPrice} ${currentPrice} = 1 (OK)`);
  console.log(`  sub ${currentPrice} ${differentPrice} = UNDERFLOW → should reject`);

  const tx2 = await buildAndBroadcastTransaction(
    programId,
    'update_oracle_price',
    [`${differentPrice}u64`, `${nextRound2}u64`],
    500_000,
  );

  if (tx2) {
    console.log(`  TX submitted: ${tx2}`);
    console.log(`  Check if ACCEPTED or REJECTED at: https://testnet.aleo.info/transaction/${tx2}`);
    console.log(`  If REJECTED: underflow theory CONFIRMED ✅`);
    console.log(`  If ACCEPTED: underflow theory DISPROVED ❌ (need to look elsewhere)`);
  } else {
    console.log(`  ❌ TX submission failed entirely`);
  }

  console.log(`\n=== Theory Test Complete ===`);
}

testSamePricePush().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
