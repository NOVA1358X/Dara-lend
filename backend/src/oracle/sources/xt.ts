import type { PriceResult } from './types.js';

// XT.com public ticker — no API key required
const API_URL = 'https://sapi.xt.com/v4/public/ticker/price?symbol=aleo_usdt';

export async function fetchFromXT(): Promise<PriceResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(API_URL, { signal: controller.signal });
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
