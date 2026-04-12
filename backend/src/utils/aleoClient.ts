import { config } from './config.js';

const GLOBAL_KEY = '0u8';

export async function getMappingValue(
  mapping: string,
  key: string = GLOBAL_KEY,
  programId: string = config.programId,
): Promise<string | null> {
  const url = `${config.aleoApiUrl}/program/${programId}/mapping/${mapping}/${key}`; // v2: /v2/testnet/program/:id/mapping/:name/:key
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    return text.replace(/"/g, '').trim() || null;
  } catch {
    return null;
  }
}

export async function getTransaction(txId: string): Promise<Record<string, unknown> | null> {
  const url = `${config.aleoApiUrl}/transaction/${encodeURIComponent(txId)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function getLatestBlockHeight(): Promise<number | null> {
  // Provable API v2 uses /block/height/latest (not /latest/height)
  const url = `${config.aleoApiUrl}/block/height/latest`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    return parseInt(text, 10) || null;
  } catch {
    return null;
  }
}

export function parseAleoU64(value: string | null): number {
  if (!value) return 0;
  const cleaned = value.replace(/u\d+/g, '').replace('.public', '').replace('.private', '').replace(/"/g, '').trim();
  return parseInt(cleaned, 10) || 0;
}

export function parseAleoField(value: string | null): string {
  if (!value) return '';
  return value.replace('field', '').replace('.public', '').replace('.private', '').trim();
}
