import type { PriceResult } from './types.js';

const API_URL = 'https://api.coinbase.com/v2/prices/ALEO-USD/spot';

export async function fetchFromCoinbase(): Promise<PriceResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(API_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { data?: { amount?: string } };
    const price = parseFloat(data?.data?.amount ?? '');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price data');
    return { source: 'coinbase', price, timestamp: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}
