import cron from 'node-cron';
import { config } from '../utils/config.js';
import { getMappingValue, parseAleoU64 } from '../utils/aleoClient.js';
import { aggregatePrices, type AggregatedPrice, type Confidence } from './aggregator.js';

// Oracle state tracking — backend only aggregates prices, frontend wallet handles on-chain writes
let lastAggregationTimestamp = 0;
let lastAggregation: AggregatedPrice | null = null;

async function refreshAggregation(): Promise<void> {
  try {
    const aggregated = await aggregatePrices();
    lastAggregation = aggregated;
    lastAggregationTimestamp = Date.now();

    console.log(
      `[oracle] Aggregated: $${aggregated.medianPrice.toFixed(4)} ` +
      `(${aggregated.sources.length} sources, confidence: ${aggregated.confidence}, ` +
      `failed: [${aggregated.failedSources.join(', ')}])`,
    );
  } catch (err) {
    console.error('[oracle] Price aggregation failed:', err);
  }
}

async function getOnChainState() {
  try {
    const [priceRaw, roundRaw] = await Promise.all([
      getMappingValue('oracle_price', '0u8'),
      getMappingValue('price_round'),
    ]);
    return {
      onChainPrice: parseAleoU64(priceRaw),
      onChainRound: parseAleoU64(roundRaw),
    };
  } catch {
    return { onChainPrice: 0, onChainRound: 0 };
  }
}

export interface OracleStatus {
  lastAggregationTimestamp: number;
  medianPrice: number;
  confidence: Confidence | null;
  sourceCount: number;
  failedSources: string[];
  sources: Array<{ source: string; price: number }>;
  onChainPrice: number;
  onChainRound: number;
}

export async function getOracleStatus(): Promise<OracleStatus> {
  const onChain = await getOnChainState();
  return {
    lastAggregationTimestamp,
    medianPrice: lastAggregation?.medianPrice ?? 0,
    confidence: lastAggregation?.confidence ?? null,
    sourceCount: lastAggregation?.sources.length ?? 0,
    failedSources: lastAggregation?.failedSources ?? [],
    sources: lastAggregation?.sources.map((s) => ({ source: s.source, price: s.price })) ?? [],
    ...onChain,
  };
}

export function startPriceUpdater(): void {
  console.log(
    `[oracle] Starting price aggregator (cron: ${config.oracleUpdateCron})`,
  );
  console.log(
    '[oracle] Backend aggregates prices from 5 sources. Oracle bot auto-pushes on-chain every 30 min via Provable DPS.',
  );

  // Run immediately, then on cron
  refreshAggregation();

  cron.schedule(config.oracleUpdateCron, () => {
    refreshAggregation();
  });
}
