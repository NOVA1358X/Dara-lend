import type { PriceResult } from './types.js';

// Gate.io — globally accessible, no auth required, ALEO_USDT pair
const API_URL = 'https://api.gateio.ws/api/v4/spot/tickers?currency_pair=ALEO_USDT';

export async function fetchFromBinance(): Promise<PriceResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(API_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Array<{ last?: string }>;
    const price = parseFloat(data?.[0]?.last ?? '');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price data');
    return { source: 'gateio', price, timestamp: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}
