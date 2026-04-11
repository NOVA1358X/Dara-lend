/**
 * Turbo Oracle Convergence Script
 * ─────────────────────────────────
 * Rapidly pushes oracle prices toward real market values for dark pool contracts
 * that are still far from target (e.g. BTC after a bad seed).
 *
 * The on-chain contract limits changes to 15% per round (MAX_DEVIATION_BPS = 1500).
 * This script pushes consecutive 14.5% changes as fast as the DPS can prove them.
 *
 * Usage: npx tsx src/turboConverge.ts [market-id]
 *   market-id: aleo-usdcx | btc-usdcx | eth-usdcx | sol-usdcx | all (default: all divergent)
 */
import { config, darkpoolMarkets, type DarkPoolMarketConfig } from './utils/config.js';
import { getMappingValue, parseAleoU64 } from './utils/aleoClient.js';
import { buildAndBroadcastTransaction } from './utils/transactionBuilder.js';
import { aggregatePrices } from './oracle/aggregator.js';

const MAX_MOVE = 0.145;         // 14.5% per step (contract allows 15%)
const CONVERGE_THRESHOLD = 0.13; // Stop when within 13% (next regular push will land exact)
const MAX_ROUNDS = 60;           // Safety cap per market
const DELAY_BETWEEN_MS = 3000;   // 3s delay between pushes (DPS needs time)

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function convergeMarket(market: DarkPoolMarketConfig): Promise<void> {
  const tag = `[turbo:${market.id}]`;
  const programId = market.programId;
  console.log(`\n${tag} Starting turbo convergence for ${market.label} (${programId})`);

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Get real price
    const aggregated = await aggregatePrices(market.oracleSymbol);
    if (!aggregated.medianPrice || aggregated.medianPrice <= 0) {
      console.error(`${tag} No price available for ${market.oracleSymbol}, aborting`);
      return;
    }

    const targetPrice = Math.round(aggregated.medianPrice * market.precision / market.priceScale);

    // Get current on-chain state
    const roundRaw = await getMappingValue('oracle_round', '0u8', programId);
    const currentRound = parseAleoU64(roundRaw) || 0;
    const nextRound = currentRound + 1;

    const priceRaw = await getMappingValue('oracle_price', '0u8', programId);
    const currentPrice = parseAleoU64(priceRaw) || 0;

    if (currentPrice <= 0) {
      console.error(`${tag} No on-chain price found, aborting`);
      return;
    }

    const deviation = Math.abs(targetPrice - currentPrice) / currentPrice;
    const displayCurrent = (currentPrice / market.precision) * market.priceScale;
    const displayTarget = aggregated.medianPrice;

    console.log(`${tag} Round ${nextRound}: on-chain $${displayCurrent.toFixed(4)} → target $${displayTarget.toFixed(4)} (${(deviation * 100).toFixed(1)}% off)`);

    // If within threshold, we're done
    if (deviation <= CONVERGE_THRESHOLD) {
      // Push exact target price
      const finalPrice = Math.max(1, Math.min(targetPrice, 100_000_000));
      console.log(`${tag} Within ${(CONVERGE_THRESHOLD * 100)}% — pushing exact target ${finalPrice}u64`);

      const tx = await buildAndBroadcastTransaction(
        programId,
        'update_oracle_price',
        [`${finalPrice}u64`, `${nextRound}u64`],
      );
      if (tx) {
        const finalDisplay = (finalPrice / market.precision) * market.priceScale;
        console.log(`${tag} ✅ CONVERGED! Final price: $${finalDisplay.toFixed(4)} (tx: ${tx})`);
      } else {
        console.error(`${tag} Final push failed`);
      }
      return;
    }

    // Clamp to MAX_MOVE toward target
    const newPrice = targetPrice > currentPrice
      ? Math.round(currentPrice * (1 + MAX_MOVE))
      : Math.round(currentPrice * (1 - MAX_MOVE));

    const clampedPrice = Math.max(1, Math.min(newPrice, 100_000_000));

    console.log(`${tag} Pushing ${clampedPrice}u64 (+${(MAX_MOVE * 100).toFixed(1)}%, step ${round + 1}/${MAX_ROUNDS})`);

    const tx = await buildAndBroadcastTransaction(
      programId,
      'update_oracle_price',
      [`${clampedPrice}u64`, `${nextRound}u64`],
    );

    if (tx) {
      console.log(`${tag} → ${tx}`);
    } else {
      console.error(`${tag} Push failed at round ${nextRound}, retrying after delay...`);
    }

    await sleep(DELAY_BETWEEN_MS);
  }

  console.warn(`${tag} ⚠️  Hit max rounds (${MAX_ROUNDS}) without converging`);
}

async function main() {
  const requestedMarket = process.argv[2]; // optional market filter

  console.log('═══════════════════════════════════════════');
  console.log('  DARA Dark Pool — Turbo Oracle Convergence');
  console.log('═══════════════════════════════════════════');

  // Find markets that need convergence
  const marketsToConverge: DarkPoolMarketConfig[] = [];

  for (const market of darkpoolMarkets) {
    if (requestedMarket && requestedMarket !== 'all' && market.id !== requestedMarket) continue;

    const aggregated = await aggregatePrices(market.oracleSymbol);
    if (!aggregated.medianPrice || aggregated.medianPrice <= 0) continue;

    const targetPrice = Math.round(aggregated.medianPrice * market.precision / market.priceScale);

    const priceRaw = await getMappingValue('oracle_price', '0u8', market.programId);
    const currentPrice = parseAleoU64(priceRaw) || 0;

    if (currentPrice <= 0) continue;

    const deviation = Math.abs(targetPrice - currentPrice) / currentPrice;
    const displayCurrent = (currentPrice / market.precision) * market.priceScale;

    if (deviation > CONVERGE_THRESHOLD) {
      console.log(`[scan] ${market.label}: $${displayCurrent.toFixed(4)} → $${aggregated.medianPrice.toFixed(4)} (${(deviation * 100).toFixed(1)}% off) — NEEDS CONVERGENCE`);
      marketsToConverge.push(market);
    } else {
      console.log(`[scan] ${market.label}: $${displayCurrent.toFixed(4)} → $${aggregated.medianPrice.toFixed(4)} (${(deviation * 100).toFixed(1)}% off) — OK`);
    }
  }

  if (marketsToConverge.length === 0) {
    console.log('\n✅ All markets are within convergence threshold. Nothing to do.');
    return;
  }

  console.log(`\n🚀 Converging ${marketsToConverge.length} market(s)...\n`);

  // Process markets sequentially (DPS nonce ordering)
  for (const market of marketsToConverge) {
    await convergeMarket(market);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  Turbo convergence complete!');
  console.log('═══════════════════════════════════════════');
}

main().catch(console.error);
