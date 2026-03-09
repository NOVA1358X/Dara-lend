import { Router } from 'express';
import { config } from '../../utils/config.js';

const router = Router();

interface PriceCache {
  price: number | null;
  timestamp: number;
}

const cache: PriceCache = { price: null, timestamp: 0 };
const CACHE_TTL = 15_000; // 15 seconds

async function fetchFromCoinGecko(): Promise<number> {
  const url = `${config.coingeckoApiUrl}/simple/price?ids=aleo&vs_currencies=usd`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = (await res.json()) as { aleo?: { usd?: number } };
  const price = data?.aleo?.usd;
  if (typeof price !== 'number' || price <= 0) throw new Error('Invalid price');
  return price;
}

async function fetchFromCryptoCompare(): Promise<number> {
  const res = await fetch('https://min-api.cryptocompare.com/data/price?fsym=ALEO&tsyms=USD');
  if (!res.ok) throw new Error(`CryptoCompare ${res.status}`);
  const data = (await res.json()) as { USD?: number };
  const price = data?.USD;
  if (typeof price !== 'number' || price <= 0) throw new Error('Invalid price');
  return price;
}

router.get('/', async (_req, res) => {
  const now = Date.now();
  if (cache.price && now - cache.timestamp < CACHE_TTL) {
    res.json({ price: cache.price, cached: true, timestamp: cache.timestamp });
    return;
  }

  for (const fetcher of [fetchFromCoinGecko, fetchFromCryptoCompare]) {
    try {
      const price = await fetcher();
      cache.price = price;
      cache.timestamp = now;
      res.json({ price, cached: false, timestamp: now });
      return;
    } catch (err) {
      console.warn(`[price] ${fetcher.name} failed: ${(err as Error).message}`);
    }
  }

  // All sources failed — return cached if available
  if (cache.price) {
    res.json({ price: cache.price, cached: true, timestamp: cache.timestamp });
  } else {
    res.status(503).json({ error: 'Price unavailable' });
  }
});

export default router;
