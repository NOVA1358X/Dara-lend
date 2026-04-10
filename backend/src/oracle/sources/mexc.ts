import type { PriceResult } from './types.js';

const API_URL = 'https://api.mexc.com/api/v3/ticker/price?symbol=ALEOUSDT';

export async function fetchFromMexc(): Promise<PriceResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(API_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { symbol?: string; price?: string };
    const price = parseFloat(data?.price ?? '');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price data');
    return { source: 'mexc', price, timestamp: Date.now() };
  } finally {
    clearTimeout(timeout);
  }
}
