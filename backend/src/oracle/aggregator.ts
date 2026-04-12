import type { PriceResult, PriceFetcher } from './sources/types.js';
import { fetchFromCoinMarketCap } from './sources/coinmarketcap.js';
import { fetchFromCoinGecko } from './sources/coingecko.js';
import { fetchFromCryptoCompare } from './sources/cryptocompare.js';
import { fetchFromCoinbase } from './sources/coinbase.js';
import { fetchFromBinance } from './sources/binance.js';
import { fetchFromMexc } from './sources/mexc.js';
import { fetchFromXT } from './sources/xt.js';

export type Confidence = 'high' | 'medium' | 'low' | 'none';

export interface AggregatedPrice {
  medianPrice: number;
  sources: PriceResult[];
  failedSources: string[];
  confidence: Confidence;
}

const FETCHERS: PriceFetcher[] = [
  fetchFromCoinMarketCap,
  fetchFromCoinGecko,
  fetchFromCryptoCompare,
  fetchFromCoinbase,
  fetchFromBinance,
  fetchFromMexc,
  fetchFromXT,
];

const OUTLIER_THRESHOLD = 0.10; // 10% from median triggers outlier removal

// Rate-limit cooldown: skip sources that recently failed with 429/rate-limit for 10 minutes
const SOURCE_COOLDOWNS: Map<string, number> = new Map();
const COOLDOWN_MS = 600_000; // 10 minutes

function isRateLimited(sourceName: string): boolean {
  const until = SOURCE_COOLDOWNS.get(sourceName);
  if (!until) return false;
  if (Date.now() >= until) { SOURCE_COOLDOWNS.delete(sourceName); return false; }
  return true;
}

function markRateLimited(sourceName: string, reason: string): void {
  if (reason.includes('429') || reason.includes('rate limit') || reason.includes('upgrade your account')) {
    SOURCE_COOLDOWNS.set(sourceName, Date.now() + COOLDOWN_MS);
  }
}

function computeMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function removeOutliers(results: PriceResult[]): PriceResult[] {
  if (results.length <= 2) return results;
  const median = computeMedian(results.map((r) => r.price));
  return results.filter((r) => {
    const deviation = Math.abs(r.price - median) / median;
    return deviation <= OUTLIER_THRESHOLD;
  });
}

function getConfidence(successCount: number, totalSources: number): Confidence {
  if (successCount >= 4) return 'high';
  if (successCount >= 2) return 'medium';
  if (successCount === 1) return 'low';
  return 'none';
}

export async function aggregatePrices(symbol: string = 'ALEO'): Promise<AggregatedPrice> {
  const sourceNames = ['coinmarketcap', 'coingecko', 'cryptocompare', 'coinbase', 'binance', 'mexc', 'xt'];

  // Skip rate-limited sources entirely
  const activeFetchers: { fetcher: PriceFetcher; name: string }[] = [];
  const skippedSources: string[] = [];

  FETCHERS.forEach((fn, i) => {
    if (isRateLimited(sourceNames[i])) {
      skippedSources.push(sourceNames[i]);
    } else {
      activeFetchers.push({ fetcher: fn, name: sourceNames[i] });
    }
  });

  const results = await Promise.allSettled(activeFetchers.map(({ fetcher }) => fetcher(symbol)));

  const successful: PriceResult[] = [];
  const failedSources: string[] = [...skippedSources];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      const name = activeFetchers[i].name;
      const reason = String(result.reason);
      failedSources.push(name);
      markRateLimited(name, reason);
      // Only log non-rate-limited failures (rate-limited ones are muted during cooldown)
      if (!reason.includes('429') && !reason.includes('rate limit') && !reason.includes('upgrade your account')) {
        console.warn(`[oracle] ${name} failed: ${result.reason}`);
      }
    }
  });

  const confidence = getConfidence(successful.length, FETCHERS.length);

  if (successful.length === 0) {
    return { medianPrice: 0, sources: [], failedSources, confidence };
  }

  // Remove outliers then compute final median
  const filtered = removeOutliers(successful);
  const medianPrice = computeMedian(filtered.map((r) => r.price));

  return { medianPrice, sources: filtered, failedSources, confidence };
}
