import { config } from '../utils/config.js';
import { getMappingValue, parseAleoU64 } from '../utils/aleoClient.js';
import { buildAndBroadcastTransaction } from '../utils/transactionBuilder.js';

/**
 * Record Scanner integration for automatic liquidation discovery.
 * Uses Provable's Record Scanner API to find LiquidationAuth records
 * owned by the orchestrator, then checks if positions are liquidatable.
 */

const SCANNER_BASE = 'https://api.provable.com/scanner/testnet';
const PRECISION = config.precision;

let scannerJwt: string | null = null;
let scannerJwtExpiry = 0;

interface ScannedRecord {
  plaintext: string;
  ciphertext: string;
  program_id: string;
  function_id: string;
  nonce: string;
  block_height: number;
}

interface LiquidationTarget {
  loanId: string;
  collateralAmount: number;
  debtAmount: number;
  collateralToken: number;
  debtToken: number;
  liquidationPrice: number;
  currentPrice: number;
}

/**
 * Register a view key with the Record Scanner.
 * Call once on startup — scanner persists registered keys.
 */
export async function registerScanner(viewKey: string, startHeight?: number): Promise<boolean> {
  try {
    const res = await fetch(`${SCANNER_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        view_key: viewKey,
        start: startHeight ?? 0,
      }),
    });

    if (!res.ok) {
      console.error(`[scanner] Registration failed: ${res.status}`);
      return false;
    }

    const data = await res.json() as { token?: string; exp?: number };
    if (data.token) {
      scannerJwt = data.token;
      scannerJwtExpiry = data.exp ?? Math.floor(Date.now() / 1000) + 3600;
    }

    console.log('[scanner] View key registered with Record Scanner');
    return true;
  } catch (err) {
    console.error('[scanner] Registration error:', err);
    return false;
  }
}

/**
 * Fetch LiquidationAuth records owned by the orchestrator.
 */
async function fetchLiquidationAuthRecords(): Promise<ScannedRecord[]> {
  if (!scannerJwt) {
    console.warn('[scanner] No JWT — call registerScanner first');
    return [];
  }

  try {
    const res = await fetch(`${SCANNER_BASE}/records/owned`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${scannerJwt}`,
      },
      body: JSON.stringify({
        programs: [config.programId],
        records: ['LiquidationAuth'],
      }),
    });

    if (!res.ok) {
      console.error(`[scanner] Fetch records failed: ${res.status}`);
      return [];
    }

    return (await res.json()) as ScannedRecord[];
  } catch (err) {
    console.error('[scanner] Fetch error:', err);
    return [];
  }
}

/**
 * Parse a LiquidationAuth record plaintext into structured data.
 */
function parseLiquidationAuth(plaintext: string): LiquidationTarget | null {
  try {
    const loanIdMatch = plaintext.match(/loan_id:\s*([\w]+field)/);
    const colAmountMatch = plaintext.match(/collateral_amount:\s*(\d+)u64/);
    const colAmount128Match = plaintext.match(/collateral_amount_u128:\s*(\d+)u128/);
    const colTokenMatch = plaintext.match(/collateral_token:\s*(\d+)u8/);
    const debtAmountMatch = plaintext.match(/debt_amount:\s*(\d+)u128/);
    const debtTokenMatch = plaintext.match(/debt_token:\s*(\d+)u8/);
    const liqPriceMatch = plaintext.match(/liquidation_price:\s*(\d+)u64/);

    if (!loanIdMatch || !liqPriceMatch || !debtAmountMatch) return null;

    const collateralToken = colTokenMatch ? parseInt(colTokenMatch[1], 10) : 0;
    const collateralAmount = collateralToken === 0
      ? (colAmountMatch ? parseInt(colAmountMatch[1], 10) : 0)
      : (colAmount128Match ? parseInt(colAmount128Match[1], 10) : 0);

    return {
      loanId: loanIdMatch[1],
      collateralAmount,
      debtAmount: parseInt(debtAmountMatch[1], 10),
      collateralToken,
      debtToken: debtTokenMatch ? parseInt(debtTokenMatch[1], 10) : 1,
      liquidationPrice: parseInt(liqPriceMatch[1], 10),
      currentPrice: 0,
    };
  } catch {
    return null;
  }
}

/**
 * Find and execute liquidations for underwater positions.
 */
export async function scanAndLiquidate(): Promise<number> {
  const records = await fetchLiquidationAuthRecords();
  if (records.length === 0) return 0;

  console.log(`[scanner] Found ${records.length} LiquidationAuth records`);

  let liquidated = 0;

  for (const record of records) {
    const target = parseLiquidationAuth(record.plaintext);
    if (!target) continue;

    // Fetch current oracle price for the collateral token
    const priceRaw = await getMappingValue('oracle_price', `${target.collateralToken}u8`);
    const currentPrice = parseAleoU64(priceRaw);
    target.currentPrice = currentPrice;

    // Check if position is liquidatable
    if (currentPrice > target.liquidationPrice) {
      continue; // Position is healthy
    }

    console.log(
      `[scanner] Liquidatable: loan=${target.loanId} price=${currentPrice / PRECISION} <= liqPrice=${target.liquidationPrice / PRECISION}`,
    );

    // Select correct liquidation transition based on collateral type
    const transition = target.collateralToken === 0
      ? 'liquidate'
      : target.collateralToken === 1
        ? 'liquidate_usdcx'
        : 'liquidate_usad';

    try {
      const txId = await buildAndBroadcastTransaction(
        config.programId,
        transition,
        [record.ciphertext, `${currentPrice}u64`],
        1_000_000,
      );

      if (txId) {
        console.log(`[scanner] Liquidation tx submitted: ${txId}`);
        liquidated++;
      }
    } catch (err) {
      console.error(`[scanner] Liquidation failed for ${target.loanId}:`, err);
    }
  }

  return liquidated;
}

/**
 * Start periodic liquidation scanning.
 */
export function startLiquidationScanner(intervalMs: number = 120_000): void {
  console.log(`[scanner] Starting auto-liquidation scanner (every ${intervalMs / 1000}s)`);

  // Initial scan
  scanAndLiquidate().catch(err => console.error('[scanner] Initial scan error:', err));

  setInterval(() => {
    scanAndLiquidate().catch(err => console.error('[scanner] Scan cycle error:', err));
  }, intervalMs);
}
