import cron from 'node-cron';
import { config } from '../utils/config.js';
import { getMappingValue, parseAleoU64 } from '../utils/aleoClient.js';
import { executeTransition } from '../utils/transactionBuilder.js';
import { aggregatePrices, type AggregatedPrice, type Confidence } from './aggregator.js';
import { validatePrice } from './validator.js';

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

function priceToMicrocredits(usdPrice: number): number {
  return Math.round(usdPrice * config.precision);
}

async function getCurrentOnChainPrice(): Promise<number> {
  const raw = await getMappingValue('oracle_price');
  return parseAleoU64(raw);
}

async function getCurrentRound(): Promise<number> {
  const raw = await getMappingValue('price_round');
  return parseAleoU64(raw);
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      console.warn(`[oracle] ${label} attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}

// Oracle state tracking
let lastUpdateTimestamp = 0;
let lastUpdatePrice = 0;
let currentRoundCounter = 0;
let lastAggregation: AggregatedPrice | null = null;

async function updatePrice(): Promise<void> {
  try {
    // 1. Aggregate prices from all sources
    const aggregated = await aggregatePrices();
    lastAggregation = aggregated;

    console.log(
      `[oracle] Aggregated: $${aggregated.medianPrice.toFixed(4)} ` +
      `(${aggregated.sources.length} sources, confidence: ${aggregated.confidence}, ` +
      `failed: [${aggregated.failedSources.join(', ')}])`,
    );

    // 2. Get current on-chain price and round
    const currentPrice = await getCurrentOnChainPrice();
    const onChainRound = await getCurrentRound();

    // 3. Validate aggregated price (pass round so first update bypasses deviation check)
    const validation = validatePrice(aggregated, currentPrice, config.precision, onChainRound);
    if (!validation.valid) {
      console.warn(`[oracle] Price rejected: ${validation.reason}`);
      return;
    }

    const newPriceMicro = priceToMicrocredits(aggregated.medianPrice);

    // 4. Check if price changed enough to warrant an update
    if (currentPrice > 0) {
      const change = Math.abs(newPriceMicro - currentPrice) / currentPrice;
      if (change < config.priceChangeThreshold) {
        console.log(
          `[oracle] Price change ${(change * 100).toFixed(4)}% below threshold, skipping update`,
        );
        return;
      }
    }

    // 5. Increment round
    if (onChainRound >= currentRoundCounter) {
      currentRoundCounter = onChainRound;
    }
    currentRoundCounter += 1;

    console.log(
      `[oracle] Updating oracle: $${aggregated.medianPrice.toFixed(4)} → ${newPriceMicro}u64, round ${currentRoundCounter}`,
    );

    // 6. Submit transaction with round
    const txId = await withRetry(
      () => executeTransition('update_oracle_price', [
        `${newPriceMicro}u64`,
        `${currentRoundCounter}u64`,
      ]),
      'executeTransition',
    );
    console.log(`[oracle] Price update transaction: ${txId}`);
    lastUpdateTimestamp = Date.now();
    lastUpdatePrice = newPriceMicro;
  } catch (err) {
    console.error('[oracle] Price update failed after retries:', err);
  }
}

export interface OracleStatus {
  lastUpdateTimestamp: number;
  lastUpdatePrice: number;
  currentRound: number;
  confidence: Confidence | null;
  sourceCount: number;
  failedSources: string[];
  sources: Array<{ source: string; price: number }>;
}

export function getOracleStatus(): OracleStatus {
  return {
    lastUpdateTimestamp,
    lastUpdatePrice,
    currentRound: currentRoundCounter,
    confidence: lastAggregation?.confidence ?? null,
    sourceCount: lastAggregation?.sources.length ?? 0,
    failedSources: lastAggregation?.failedSources ?? [],
    sources: lastAggregation?.sources.map((s) => ({ source: s.source, price: s.price })) ?? [],
  };
}

export function startPriceUpdater(): void {
  if (!config.privateKey || config.privateKey === 'APrivateKey1...') {
    console.warn(
      '[oracle] PRIVATE_KEY not set — oracle price updater disabled',
    );
    return;
  }

  if (!config.provableApiKey) {
    console.warn(
      '[oracle] PROVABLE_API_KEY not set — oracle updater disabled. ' +
      'Local WASM proving hangs for programs with 4+ imports. ' +
      'Set PROVABLE_API_KEY and PROVABLE_CONSUMER_ID in .env to enable automatic oracle updates.',
    );
    return;
  }

  console.log(
    `[oracle] Starting price updater (cron: ${config.oracleUpdateCron})`,
  );

  // Initialize round from on-chain state
  getCurrentRound().then((r) => {
    currentRoundCounter = r;
    console.log(`[oracle] Initialized round counter from on-chain: ${r}`);
  }).catch(() => {
    console.warn('[oracle] Could not read on-chain round, starting from 0');
  });

  updatePrice();

  cron.schedule(config.oracleUpdateCron, () => {
    updatePrice();
  });
}
