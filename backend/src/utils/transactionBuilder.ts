import { config } from './config.js';

type TxStatus = 'pending' | 'proving' | 'broadcast' | 'confirmed' | 'failed';

interface DpsResult {
  txId: string | null;
  status: TxStatus;
  error?: string;
}

// JWT cache — refreshed when within 5 min of expiry
let cachedJwt: string | null = null;
let jwtExpiry = 0;

// SDK module cache — WASM initializes once at startup, not per-request
let sdkCache: typeof import('@provablehq/sdk') | null = null;

async function getSdk(): Promise<typeof import('@provablehq/sdk')> {
  if (!sdkCache) {
    sdkCache = await import('@provablehq/sdk');
    console.log('[tx-builder] Provable SDK loaded and cached');
  }
  return sdkCache;
}

/** Pre-warm the SDK (call at server startup to avoid cold-start on first request). */
export async function warmupSdk(): Promise<void> {
  try {
    await getSdk();
    console.log('[tx-builder] SDK warmup complete');
  } catch (err) {
    console.warn('[tx-builder] SDK warmup failed (non-fatal):', err);
  }
}

/**
 * Issue a JWT from the Provable auth service and cache it.
 * JWT lives in the `authorization` response header.
 * Expires in ~1 hour; we refresh 5 min before expiry.
 */
async function getProvableJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && jwtExpiry - now > 300) return cachedJwt;

  const res = await fetch(
    `https://api.provable.com/jwts/${config.provableConsumerId}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'X-Provable-API-Key': config.provableApiKey,
      },
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown');
    throw new Error(`JWT issue failed ${res.status}: ${text}`);
  }

  const authHeader = res.headers.get('authorization');
  if (!authHeader) throw new Error('No authorization header in JWT response');

  const body = await res.json() as { exp: number };
  cachedJwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  jwtExpiry = body.exp ?? now + 3600;
  console.log(`[dps] JWT issued, expires in ${jwtExpiry - now}s`);
  return cachedJwt;
}

// Track recent DPS submissions for health reporting
const recentSubmissions: Array<{ timestamp: number; program: string; transition: string; status: TxStatus; txId: string | null }> = [];
const MAX_RECENT = 50;

function recordSubmission(program: string, transition: string, status: TxStatus, txId: string | null) {
  recentSubmissions.unshift({ timestamp: Date.now(), program, transition, status, txId });
  if (recentSubmissions.length > MAX_RECENT) recentSubmissions.pop();
}

export function getRecentSubmissions() {
  return recentSubmissions;
}

/**
 * Build and broadcast a transaction via Provable Delegated Proving Service (DPS).
 * Falls back to local execution if DPS is not configured.
 * @param privateKey Optional alternate private key (defaults to config.privateKey)
 */
export async function buildAndBroadcastTransaction(
  programId: string,
  transition: string,
  inputs: string[],
  fee: number = 500_000,
  privateKey?: string,
): Promise<string | null> {
  const key = privateKey || config.privateKey;
  if (!key) {
    console.warn('[tx-builder] No PRIVATE_KEY configured');
    return null;
  }

  // Use DPS if enabled and configured
  if (config.dpsEnabled && config.provableApiKey && config.provableConsumerId) {
    return executeDps(programId, transition, inputs, fee, key);
  }

  // Fallback: local proving via SDK
  return executeLocal(programId, transition, inputs, fee, key);
}

/**
 * Execute via Provable Delegated Proving Service.
 * Builds authorization locally, submits to DPS for remote proving + broadcast.
 */
async function executeDps(
  programId: string,
  transition: string,
  inputs: string[],
  fee: number,
  privateKey: string,
): Promise<string | null> {
  try {
    console.log(`[dps] Building proving request for ${programId}/${transition}...`);

    const sdk = await getSdk();
    const account = new sdk.Account({ privateKey });
    const networkClient = new sdk.AleoNetworkClient(config.aleoRpcUrl);

    // Build the proving request — retry once on cold-start failure
    let provingRequest: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const pm = new sdk.ProgramManager(config.aleoRpcUrl, undefined, undefined);
      pm.setAccount(account);
      try {
        provingRequest = await (pm as any).provingRequest({
          programName: programId,
          functionName: transition,
          inputs,
          priorityFee: fee,
          privateFee: false,
          useFeeMaster: config.useFeeMaster,
          broadcast: true,
        });
      } catch (e) {
        console.warn(`[dps] provingRequest attempt ${attempt} threw:`, e);
      }
      if (provingRequest) break;
      if (attempt < 2) {
        console.warn(`[dps] provingRequest returned null on attempt ${attempt}, retrying...`);
        await sleep(1500);
      }
    }

    if (!provingRequest) {
      console.error(`[dps] Failed to build proving request for ${transition} after 2 attempts`);
      recordSubmission(programId, transition, 'failed', null);
      return null;
    }

    console.log(`[dps] Submitting to DPS: ${config.provableDpsUrl}`);

    // Submit to Provable DPS for remote proving
    const result = await submitToDps(provingRequest, networkClient, sdk);

    if (result.txId) {
      console.log(`[dps] ${programId}/${transition} → ${result.txId} (${result.status})`);
      recordSubmission(programId, transition, result.status, result.txId);
      // Invalidate JWT after successful use — Provable DPS may issue single-use tokens
      cachedJwt = null;
      return result.txId;
    }

    console.error(`[dps] ${transition} failed: ${result.error}`);
    recordSubmission(programId, transition, 'failed', null);
    return null;
  } catch (err) {
    console.error(`[dps] Failed to execute ${transition}:`, err);
    recordSubmission(programId, transition, 'failed', null);
    return null;
  }
}

/**
 * Submit a proving request to the Provable DPS endpoint.
 * Uses raw HTTP with JWT. Retries with exponential backoff on transient failures.
 */
async function submitToDps(
  provingRequest: unknown,
  _networkClient: any,
  _sdk: any,
): Promise<DpsResult> {
  const maxRetries = 3;
  let delay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await submitDpsRaw(provingRequest);
    } catch (err: any) {
      const isTransient = err?.status === 429 || err?.status >= 500 || err?.code === 'ECONNRESET';
      if (isTransient && attempt < maxRetries) {
        console.warn(`[dps] Attempt ${attempt} failed (${err.status || err.code}), retrying in ${delay}ms...`);
        await sleep(delay);
        delay *= 2;
        continue;
      }
      return { txId: null, status: 'failed', error: String(err) };
    }
  }
  return { txId: null, status: 'failed', error: 'Max retries exceeded' };
}

/**
 * Submit a proving request directly via HTTP to the DPS /prove endpoint.
 * Serializes WASM ProvingRequest via .toString() if needed.
 */
async function submitDpsRaw(provingRequest: unknown): Promise<DpsResult> {
  const token = await getProvableJwt();
  // Endpoint: https://api.provable.com/prove/testnet/prove
  const url = `${config.provableDpsUrl}/prove`;

  // WASM ProvingRequest objects don't JSON.stringify correctly — use toString()
  let body: string;
  if (provingRequest && typeof (provingRequest as any).toString === 'function' &&
      typeof (provingRequest as any).authorization === 'function') {
    // WASM ProvingRequest: serialize via toString()
    body = (provingRequest as any).toString();
  } else {
    body = JSON.stringify(provingRequest);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown');
    // Force JWT refresh on auth errors
    if (res.status === 401 || res.status === 403) cachedJwt = null;
    return { txId: null, status: 'failed', error: `DPS ${res.status}: ${text}` };
  }

  const data = await res.json() as any;
  console.log(`[dps] response:`, JSON.stringify(data).substring(0, 300));
  // DPS returns { transaction: { id: "..." } } or { transaction_id: "..." } or { id: "..." }
  const txId = data?.transaction?.id
    ?? data?.transaction_id
    ?? data?.transactionId
    ?? data?.job_id
    ?? data?.jobId
    ?? data?.id
    ?? null;
  return { txId, status: txId ? 'broadcast' : 'failed', error: txId ? undefined : `No TX ID in response: ${JSON.stringify(data).substring(0, 200)}` };
}

/**
 * Local proving fallback via ProgramManager.execute().
 */
async function executeLocal(
  programId: string,
  transition: string,
  inputs: string[],
  fee: number,
  privateKey: string,
): Promise<string | null> {
  try {
    const sdk = await getSdk();
    const account = new sdk.Account({ privateKey });
    const pm = new sdk.ProgramManager(config.aleoRpcUrl, undefined, undefined);
    pm.setAccount(account);

    const txId = await pm.execute({
      programName: programId,
      functionName: transition,
      inputs,
      fee,
      privateFee: false,
    } as any);

    if (txId) {
      const id = typeof txId === 'string' ? txId : String(txId);
      console.log(`[tx-builder] Broadcast ${programId}/${transition} → ${id}`);
      recordSubmission(programId, transition, 'broadcast', id);
      return id;
    }
    recordSubmission(programId, transition, 'failed', null);
    return null;
  } catch (err) {
    console.error(`[tx-builder] Failed to execute ${transition}:`, err);
    recordSubmission(programId, transition, 'failed', null);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Legacy export for backwards compat
 */
export async function executeTransition(
  transition: string,
  inputs: string[],
): Promise<string> {
  const txId = await buildAndBroadcastTransaction(config.programId, transition, inputs);
  if (!txId) throw new Error('Transaction broadcast failed');
  return txId;
}
