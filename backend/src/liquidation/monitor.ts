import { getMappingValue, parseAleoU64 } from '../utils/aleoClient.js';
import { config } from '../utils/config.js';

async function printProtocolStatus(): Promise<void> {
  console.log('\n=== DARA Lend Protocol Status ===\n');

  const [collateralRaw, borrowedRaw, loansRaw, priceRaw] = await Promise.all([
    getMappingValue('vault_total_collateral'),
    getMappingValue('total_borrowed'),
    getMappingValue('loan_count'),
    getMappingValue('oracle_price'),
  ]);

  const totalCollateral = parseAleoU64(collateralRaw);
  const totalBorrowed = parseAleoU64(borrowedRaw);
  const loanCount = parseAleoU64(loansRaw);
  const oraclePrice = parseAleoU64(priceRaw);

  console.log(`  Total Collateral: ${(totalCollateral / config.precision).toFixed(6)} ALEO`);
  console.log(`  Total Borrowed:   ${(totalBorrowed / config.precision).toFixed(6)} ALEO`);
  console.log(`  Active Loans:     ${loanCount}`);
  console.log(`  Oracle Price:     $${(oraclePrice / config.precision).toFixed(4)}`);

  const utilizationRate =
    totalCollateral > 0
      ? ((totalBorrowed / totalCollateral) * 100).toFixed(2)
      : '0.00';
  console.log(`  Utilization:      ${utilizationRate}%`);

  const collRatio =
    totalBorrowed > 0
      ? ((totalCollateral / totalBorrowed) * 100).toFixed(2)
      : 'N/A';
  console.log(`  Collateral Ratio: ${collRatio}%`);

  console.log('\n================================\n');
}

async function main() {
  try {
    await printProtocolStatus();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
