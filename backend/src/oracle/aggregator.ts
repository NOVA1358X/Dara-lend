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

export async function aggregatePrices(): Promise<AggregatedPrice> {
  const results = await Promise.allSettled(FETCHERS.map((fn) => fn()));

  const successful: PriceResult[] = [];
  const failedSources: string[] = [];
  const sourceNames = ['coinmarketcap', 'coingecko', 'cryptocompare', 'coinbase', 'gateio', 'mexc', 'xt'];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failedSources.push(sourceNames[i]);
      console.warn(`[oracle] ${sourceNames[i]} failed: ${result.reason}`);
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
