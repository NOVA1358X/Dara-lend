import { config } from '../../utils/config.js';
import type { PriceResult } from './types.js';

const COINGECKO_IDS: Record<string, string> = {
  ALEO: 'aleo',
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
};

export async function fetchFromCoinGecko(symbol: string = 'ALEO'): Promise<PriceResult> {
  const coinId = COINGECKO_IDS[symbol] ?? symbol.toLowerCase();
  const url = `${config.coingeckoApiUrl}/simple/price?ids=${coinId}&vs_currencies=usd`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, { usd?: number }>;
    const price = data?.[coinId]?.usd;
    if (typeof price !== 'number' || price <= 0) throw new Error('Invalid price data');
    return { source: 'coingecko', price, timestamp: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}
