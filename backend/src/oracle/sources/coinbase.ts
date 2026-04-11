import type { PriceResult } from './types.js';

const COINBASE_SYMBOLS: Record<string, string> = {
  ALEO: 'ALEO-USD',
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
  SOL: 'SOL-USD',
};

export async function fetchFromCoinbase(symbol: string = 'ALEO'): Promise<PriceResult> {
  const pair = COINBASE_SYMBOLS[symbol] ?? `${symbol}-USD`;
  const url = `https://api.coinbase.com/v2/prices/${pair}/spot`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { data?: { amount?: string } };
    const price = parseFloat(data?.data?.amount ?? '');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price data');
    return { source: 'coinbase', price, timestamp: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}
