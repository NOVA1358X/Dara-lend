import type { PriceResult } from './types.js';

const API_URL = 'https://api.binance.com/api/v3/ticker/price?symbol=ALEOUSDT';

export async function fetchFromBinance(): Promise<PriceResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(API_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { price?: string };
    const price = parseFloat(data?.price ?? '');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price data');
    return { source: 'binance', price, timestamp: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}
