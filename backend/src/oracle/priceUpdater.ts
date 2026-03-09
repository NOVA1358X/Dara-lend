import cron from 'node-cron';
import { config } from '../utils/config.js';
import { getMappingValue, parseAleoU64 } from '../utils/aleoClient.js';
import { executeTransition } from '../utils/transactionBuilder.js';

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

async function fetchFromCoinGecko(): Promise<number> {
  const url = `${config.coingeckoApiUrl}/simple/price?ids=aleo&vs_currencies=usd`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
  const data = (await res.json()) as { aleo?: { usd?: number } };
  const price = data?.aleo?.usd;
  if (!price) throw new Error('ALEO price not available from CoinGecko');
  return price;
}

async function fetchFromCryptoCompare(): Promise<number> {
  const res = await fetch('https://min-api.cryptocompare.com/data/price?fsym=ALEO&tsyms=USD');
  if (!res.ok) throw new Error(`CryptoCompare API error: ${res.status}`);
  const data = (await res.json()) as { USD?: number };
  const price = data?.USD;
  if (!price) throw new Error('ALEO price not available from CryptoCompare');
  return price;
}

let lastFetchedPrice = 0;

async function fetchAleoPrice(): Promise<number> {
  // Try CoinGecko first, fall back to CryptoCompare
  for (const fetcher of [fetchFromCoinGecko, fetchFromCryptoCompare]) {
    try {
      const price = await fetcher();
      lastFetchedPrice = price;
      return price;
    } catch (err) {
      console.warn(`[oracle] ${fetcher.name} failed: ${(err as Error).message}`);
    }
  }
  // If all APIs fail but we have a cached price, use it
  if (lastFetchedPrice > 0) {
    console.warn(`[oracle] All price APIs failed, using cached price: $${lastFetchedPrice.toFixed(4)}`);
    return lastFetchedPrice;
  }
  throw new Error('All price sources failed and no cached price available');
}

function priceToMicrocredits(usdPrice: number): number {
  return Math.round(usdPrice * config.precision);
}

async function getCurrentOnChainPrice(): Promise<number> {
  const raw = await getMappingValue('oracle_price');
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

let lastUpdateTimestamp = 0;
let lastUpdatePrice = 0;

async function updatePrice(): Promise<void> {
  try {
    const usdPrice = await withRetry(fetchAleoPrice, 'fetchPrice');
    const newPriceMicro = priceToMicrocredits(usdPrice);

    const currentPrice = await getCurrentOnChainPrice();

    if (currentPrice > 0) {
      const change = Math.abs(newPriceMicro - currentPrice) / currentPrice;
      if (change < config.priceChangeThreshold) {
        console.log(
          `[oracle] Price change ${(change * 100).toFixed(4)}% below threshold, skipping update`,
        );
        return;
      }
    }

    console.log(
      `[oracle] Updating oracle price: $${usdPrice.toFixed(4)} → ${newPriceMicro}u64`,
    );

    const txId = await withRetry(
      () => executeTransition('update_oracle_price', [`${newPriceMicro}u64`]),
      'executeTransition',
    );
    console.log(`[oracle] Price update transaction: ${txId}`);
    lastUpdateTimestamp = Date.now();
    lastUpdatePrice = newPriceMicro;
  } catch (err) {
    console.error('[oracle] Price update failed after retries:', err);
  }
}

export function getOracleStatus() {
  return { lastUpdateTimestamp, lastUpdatePrice };
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

  updatePrice();

  cron.schedule(config.oracleUpdateCron, () => {
    updatePrice();
  });
}
