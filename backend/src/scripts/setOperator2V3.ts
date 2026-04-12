import 'dotenv/config';
import { buildAndBroadcastTransaction } from '../utils/transactionBuilder.js';
import { config } from '../utils/config.js';

// v3 contract has set_operators(op1, op2, op3) — sets all 3 operator slots at once.
// Caller must be operators[0] (admin). Keep op1=admin, set op2=operator2, op3=admin.
const adminAddress = config.adminAddress;
const operator2Address = config.operator2Address || 'aleo178zc37zrvc2jc0kh2jgwr588mz647elwc2uzkw87dx8w9nhcfgyq3ra3cz';

console.log('[setup] Setting operators on dara_dark_pool_v3.aleo');
console.log('[setup] Admin (op1, op3):', adminAddress);
console.log('[setup] Operator2 (op2):', operator2Address);
console.log('[setup] DPS enabled:', config.dpsEnabled);

const tx = await buildAndBroadcastTransaction(
  'dara_dark_pool_v3.aleo',
  'set_operators',
  [adminAddress, operator2Address, adminAddress],
  500_000,
);

console.log('[setup] set_operators TX result:', tx);
process.exit(tx ? 0 : 1);
