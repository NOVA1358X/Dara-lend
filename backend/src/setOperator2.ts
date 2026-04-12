import { buildAndBroadcastTransaction } from './utils/transactionBuilder.js';
import { config } from './utils/config.js';

const DELAY_MS = 35_000;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const ADMIN = config.adminAddress;
const OPERATOR2 = config.operator2Address || 'aleo178zc37zrvc2jc0kh2jgwr588mz647elwc2uzkw87dx8w9nhcfgyq3ra3cz';

async function setOperator2() {
  console.log('=== Setting Operator 2 on v5 Dark Pools ===');
  console.log(`Admin (op1): ${ADMIN}`);
  console.log(`Operator2:   ${OPERATOR2}\n`);

  const programs = [
    'dara_dp_btc_v5.aleo',
    'dara_dp_eth_v5.aleo',
    'dara_dp_sol_v5.aleo',
  ];

  // set_operators(op1, op2, op3) — operators[1]=admin, operators[2]=op2, operators[3]=admin
  for (let i = 0; i < programs.length; i++) {
    const pid = programs[i];
    console.log(`[${i + 1}/${programs.length}] set_operators on ${pid}`);
    console.log(`  op1=${ADMIN}`);
    console.log(`  op2=${OPERATOR2}`);
    console.log(`  op3=${ADMIN}`);

    const tx = await buildAndBroadcastTransaction(
      pid,
      'set_operators',
      [ADMIN, OPERATOR2, ADMIN],
      500_000,
    );
    console.log(tx ? `  ✓ TX: ${tx}` : `  ✗ FAILED`);

    if (i < programs.length - 1) {
      console.log(`  Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  console.log('\n=== Done! Operator 2 set on all v5 dark pools ===');
}

setOperator2().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
