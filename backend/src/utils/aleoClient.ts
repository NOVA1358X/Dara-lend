import { config } from './config.js';

const GLOBAL_KEY = '0u8';

export async function getMappingValue(
  mapping: string,
  key: string = GLOBAL_KEY,
): Promise<string | null> {
  const url = `${config.aleoApiUrl}/program/${config.programId}/mapping/${mapping}/${key}`;
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
  const url = `${config.aleoApiUrl}/latest/height`;
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
  const cleaned = value.replace('u64', '').replace('.public', '').replace('.private', '').trim();
  return parseInt(cleaned, 10) || 0;
}

export function parseAleoField(value: string | null): string {
  if (!value) return '';
  return value.replace('field', '').replace('.public', '').replace('.private', '').trim();
}
