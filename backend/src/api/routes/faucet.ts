import { Router } from 'express';
import { config } from '../../utils/config.js';
import { buildAndBroadcastTransaction } from '../../utils/transactionBuilder.js';

const router = Router();

// Daily claim limits per token per address (in-memory, resets on server restart)
const claimLog = new Map<string, { count: number; resetAt: number }>();

const TOKENS: Record<string, { programId: string; symbol: string }> = {
  BTC: { programId: config.testBtcProgramId, symbol: 'BTC' },
  ETH: { programId: config.testEthProgramId, symbol: 'ETH' },
  SOL: { programId: config.testSolProgramId, symbol: 'SOL' },
};

// 10 tokens per claim (6 decimals)
const CLAIM_AMOUNT = '10000000u64';       // 10 tokens
const MAX_CLAIMS_PER_DAY = 5;              // 5 claims per token per address per day
const DAY_MS = 24 * 60 * 60 * 1000;

function claimKey(address: string, token: string): string {
  return `${address}:${token}`;
}

function checkRateLimit(address: string, token: string): { allowed: boolean; remaining: number; resetIn: number } {
  const key = claimKey(address, token);
  const now = Date.now();
  const entry = claimLog.get(key);

  if (!entry || now >= entry.resetAt) {
    return { allowed: true, remaining: MAX_CLAIMS_PER_DAY, resetIn: DAY_MS };
  }

  if (entry.count >= MAX_CLAIMS_PER_DAY) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  return { allowed: true, remaining: MAX_CLAIMS_PER_DAY - entry.count, resetIn: entry.resetAt - now };
}

function recordClaim(address: string, token: string): void {
  const key = claimKey(address, token);
  const now = Date.now();
  const entry = claimLog.get(key);

  if (!entry || now >= entry.resetAt) {
    claimLog.set(key, { count: 1, resetAt: now + DAY_MS });
  } else {
    entry.count += 1;
  }
}

// Serialize faucet requests to avoid nonce conflicts
let faucetQueue: Promise<unknown> = Promise.resolve();

// POST /api/faucet/claim — claim test tokens
router.post('/claim', async (req, res) => {
  try {
    const { address, token } = req.body as { address?: string; token?: string };

    if (!address || typeof address !== 'string' || !address.startsWith('aleo1') || address.length < 50) {
      res.status(400).json({ error: 'Invalid Aleo address' });
      return;
    }

    const upperToken = (token || '').toUpperCase();
    const tokenConfig = TOKENS[upperToken];
    if (!tokenConfig) {
      res.status(400).json({ error: `Invalid token. Supported: ${Object.keys(TOKENS).join(', ')}` });
      return;
    }

    // Rate limit check
    const limit = checkRateLimit(address, upperToken);
    if (!limit.allowed) {
      const hours = Math.ceil(limit.resetIn / (1000 * 60 * 60));
      res.status(429).json({
        error: `Daily limit reached for ${upperToken}. Try again in ~${hours}h.`,
        remaining: 0,
        resetIn: limit.resetIn,
      });
      return;
    }

    // Queue the transfer to avoid nonce conflicts
    const result = await (faucetQueue = faucetQueue.then(async () => {
      console.log(`[faucet] Transferring 10 ${tokenConfig.symbol} to ${address.slice(0, 20)}...`);
      const txId = await buildAndBroadcastTransaction(
        tokenConfig.programId,
        'transfer_public',
        [address, CLAIM_AMOUNT],
        500_000,
      );
      return txId;
    }).catch(err => {
      console.error(`[faucet] Transfer failed:`, err);
      return null;
    }));

    if (result) {
      recordClaim(address, upperToken);
      const remaining = checkRateLimit(address, upperToken).remaining;
      console.log(`[faucet] ✓ ${tokenConfig.symbol} sent to ${address.slice(0, 20)}... TX: ${result}`);
      res.json({
        success: true,
        txId: result,
        token: upperToken,
        amount: 10,
        remaining,
        message: `10 ${tokenConfig.symbol} sent! TX may take 1-2 minutes to confirm.`,
      });
    } else {
      res.status(500).json({ error: `Failed to transfer ${tokenConfig.symbol}. Try again later.` });
    }
  } catch (err) {
    console.error('[faucet] Error:', err);
    res.status(500).json({ error: 'Faucet error' });
  }
});

// GET /api/faucet/status/:address — check remaining claims
router.get('/status/:address', (req, res) => {
  const address = req.params.address;
  if (!address || !address.startsWith('aleo1')) {
    res.status(400).json({ error: 'Invalid address' });
    return;
  }

  const status = Object.entries(TOKENS).map(([symbol]) => {
    const limit = checkRateLimit(address, symbol);
    return {
      token: symbol,
      remaining: limit.remaining,
      maxPerDay: MAX_CLAIMS_PER_DAY,
      amountPerClaim: 10,
    };
  });

  res.json({ address, tokens: status });
});

export default router;
