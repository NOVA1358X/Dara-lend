import type { PriceResult } from './types.js';

const API_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';
const API_KEY = process.env.CMC_API_KEY || '';

export async function fetchFromCoinMarketCap(): Promise<PriceResult> {
  if (!API_KEY) throw new Error('CMC_API_KEY not set');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${API_URL}?symbol=ALEO&convert=USD`, {
      signal: controller.signal,
      headers: { 'X-CMC_PRO_API_KEY': API_KEY },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      data?: { ALEO?: { quote?: { USD?: { price?: number } } } };
    };
    const price = data?.data?.ALEO?.quote?.USD?.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0)
      throw new Error('Invalid price data');
    return { source: 'coinmarketcap', price, timestamp: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}
