import type { PriceResult } from './types.js';

const API_URL = 'https://min-api.cryptocompare.com/data/price?fsym=ALEO&tsyms=USD';

export async function fetchFromCryptoCompare(): Promise<PriceResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(API_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { USD?: number; Response?: string; Message?: string };
    // CryptoCompare returns 200 with { Response: 'Error' } when symbol is unknown or rate-limited
    if (data?.Response === 'Error') throw new Error(data.Message ?? 'CryptoCompare error');
    const price = data?.USD;
    if (typeof price !== 'number' || price <= 0) throw new Error('Invalid price data');
    return { source: 'cryptocompare', price, timestamp: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}
