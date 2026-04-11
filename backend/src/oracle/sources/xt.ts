import type { PriceResult } from './types.js';

// XT.com public ticker — no API key required
const XT_SYMBOLS: Record<string, string> = {
  ALEO: 'aleo_usdt',
  BTC: 'btc_usdt',
  ETH: 'eth_usdt',
  SOL: 'sol_usdt',
};

export async function fetchFromXT(symbol: string = 'ALEO'): Promise<PriceResult> {
  const pair = XT_SYMBOLS[symbol] ?? `${symbol.toLowerCase()}_usdt`;
  const url = `https://sapi.xt.com/v4/public/ticker/price?symbol=${pair}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      rc?: number;
      result?: Array<{ s?: string; p?: string }>;
    };
    if (data?.rc !== 0 || !Array.isArray(data?.result) || data.result.length === 0) {
      throw new Error('Unexpected response structure');
    }
    const price = parseFloat(data.result[0]?.p ?? '');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price data');
    return { source: 'xt', price, timestamp: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}
