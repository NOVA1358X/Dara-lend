import type { PriceResult } from './types.js';

// Gate.io — globally accessible, no auth required
const GATEIO_PAIRS: Record<string, string> = {
  ALEO: 'ALEO_USDT',
  BTC: 'BTC_USDT',
  ETH: 'ETH_USDT',
  SOL: 'SOL_USDT',
};

export async function fetchFromBinance(symbol: string = 'ALEO'): Promise<PriceResult> {
  const pair = GATEIO_PAIRS[symbol] ?? `${symbol}_USDT`;
  const url = `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${pair}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Array<{ last?: string }>;
    const price = parseFloat(data?.[0]?.last ?? '');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price data');
    return { source: 'gateio', price, timestamp: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}
