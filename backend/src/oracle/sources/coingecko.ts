import { config } from '../../utils/config.js';
import type { PriceResult } from './types.js';

export async function fetchFromCoinGecko(): Promise<PriceResult> {
  const url = `${config.coingeckoApiUrl}/simple/price?ids=aleo&vs_currencies=usd`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { aleo?: { usd?: number } };
    const price = data?.aleo?.usd;
    if (typeof price !== 'number' || price <= 0) throw new Error('Invalid price data');
    return { source: 'coingecko', price, timestamp: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}
