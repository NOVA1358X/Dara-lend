import type { PriceResult } from './types.js';

const MEXC_SYMBOLS: Record<string, string> = {
  ALEO: 'ALEOUSDT',
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
};

export async function fetchFromMexc(symbol: string = 'ALEO'): Promise<PriceResult> {
  const pair = MEXC_SYMBOLS[symbol] ?? `${symbol}USDT`;
  const url = `https://api.mexc.com/api/v3/ticker/price?symbol=${pair}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { symbol?: string; price?: string };
    const price = parseFloat(data?.price ?? '');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price data');
    return { source: 'mexc', price, timestamp: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}
