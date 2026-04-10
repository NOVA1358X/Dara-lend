import { Router } from 'express';
import { config } from '../../utils/config.js';

const router = Router();

const CMC_API_KEY = process.env.CMC_API_KEY || '';

interface PriceCache {
  price: number | null;
  timestamp: number;
  source: string | null;
}

const cache: PriceCache = { price: null, timestamp: 0, source: null };
const CACHE_TTL = 300_000; // 5 minutes

async function fetchFromCoinbase(): Promise<number> {
  const res = await fetch('https://api.coinbase.com/v2/prices/ALEO-USD/spot');
  if (!res.ok) throw new Error(`Coinbase ${res.status}`);
  const data = (await res.json()) as { data?: { amount?: string } };
  const price = parseFloat(data?.data?.amount ?? '');
  if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price');
  return price;
}

async function fetchFromGateIO(): Promise<number> {
  const res = await fetch('https://api.gateio.ws/api/v4/spot/tickers?currency_pair=ALEO_USDT');
  if (!res.ok) throw new Error(`GateIO ${res.status}`);
  const data = (await res.json()) as Array<{ last?: string }>;
  const price = parseFloat(data?.[0]?.last ?? '');
  if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price');
  return price;
}

async function fetchFromMexc(): Promise<number> {
  const res = await fetch('https://api.mexc.com/api/v3/ticker/price?symbol=ALEOUSDT');
  if (!res.ok) throw new Error(`MEXC ${res.status}`);
  const data = (await res.json()) as { price?: string };
  const price = parseFloat(data?.price ?? '');
  if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price');
  return price;
}

async function fetchFromXT(): Promise<number> {
  const res = await fetch('https://sapi.xt.com/v4/public/ticker/price?symbol=aleo_usdt');
  if (!res.ok) throw new Error(`XT ${res.status}`);
  const data = (await res.json()) as { rc?: number; result?: Array<{ p?: string }> };
  if (data?.rc !== 0 || !Array.isArray(data?.result) || !data.result.length) throw new Error('Invalid response');
  const price = parseFloat(data.result[0]?.p ?? '');
  if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price');
  return price;
}

async function fetchFromCoinMarketCap(): Promise<number> {
  if (!CMC_API_KEY) throw new Error('CMC_API_KEY not set');
  const res = await fetch(
    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=ALEO&convert=USD',
    { headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY } },
  );
  if (!res.ok) throw new Error(`CoinMarketCap ${res.status}`);
  const data = (await res.json()) as {
    data?: { ALEO?: { quote?: { USD?: { price?: number } } } };
  };
  const price = data?.data?.ALEO?.quote?.USD?.price;
  if (typeof price !== 'number' || price <= 0) throw new Error('Invalid price');
  return price;
}

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
    res.json({ price: cache.price, cached: true, source: cache.source, timestamp: cache.timestamp });
    return;
  }

  for (const fetcher of [fetchFromCoinbase, fetchFromGateIO, fetchFromMexc, fetchFromXT, fetchFromCoinGecko, fetchFromCoinMarketCap, fetchFromCryptoCompare]) {
    try {
      const price = await fetcher();
      cache.price = price;
      cache.timestamp = now;
      cache.source = fetcher.name.replace('fetchFrom', '').toLowerCase();
      res.json({ price, cached: false, source: cache.source, timestamp: now });
      return;
    } catch (err) {
      console.warn(`[price] ${fetcher.name} failed: ${(err as Error).message}`);
    }
  }

  // All sources failed — return cached if available
  if (cache.price) {
    res.json({ price: cache.price, cached: true, source: cache.source, timestamp: cache.timestamp });
  } else {
    res.status(503).json({ error: 'Price unavailable' });
  }
});

export default router;
