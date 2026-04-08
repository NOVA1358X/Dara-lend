import { Router } from 'express';
import { config } from '../../utils/config.js';
import { buildAndBroadcastTransaction } from '../../utils/transactionBuilder.js';

const router = Router();

const GOV_PROGRAM = config.govProgramId;
const CLAIM_AMOUNT = 1000; // Each claim gives 1000 GOV tokens
const CLAIM_COOLDOWN_MS = 300_000; // 5 min cooldown per address

// Simple in-memory cooldown tracker (resets on server restart — fine for testnet)
const claimTimestamps = new Map<string, number>();

/**
 * POST /api/governance/claim
 * Testnet faucet: mints governance tokens to requesting user.
 * Requires { address: "aleo1..." } in body.
 */
router.post('/claim', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string' || !address.startsWith('aleo1') || address.length < 60) {
      return res.status(400).json({ error: 'Valid Aleo address required' });
    }

    // Cooldown check
    const lastClaim = claimTimestamps.get(address) ?? 0;
    const elapsed = Date.now() - lastClaim;
    if (elapsed < CLAIM_COOLDOWN_MS) {
      const waitSec = Math.ceil((CLAIM_COOLDOWN_MS - elapsed) / 1000);
      return res.status(429).json({ error: `Cooldown active. Try again in ${waitSec}s` });
    }

    if (!config.privateKey) {
      return res.status(503).json({ error: 'Admin key not configured on backend' });
    }

    console.log(`[gov] Minting ${CLAIM_AMOUNT} GOV tokens to ${address.slice(0, 12)}...`);

    const txId = await buildAndBroadcastTransaction(
      GOV_PROGRAM,
      'mint_governance_tokens',
      [address, `${CLAIM_AMOUNT}u64`],
      500_000,
    );

    if (!txId) {
      return res.status(500).json({ error: 'Transaction broadcast failed' });
    }

    claimTimestamps.set(address, Date.now());

    console.log(`[gov] Minted ${CLAIM_AMOUNT} GOV → ${address.slice(0, 12)}... TX: ${txId}`);

    return res.json({
      success: true,
      txId,
      amount: CLAIM_AMOUNT,
      message: `Claimed ${CLAIM_AMOUNT} GOV tokens. TX confirming on-chain...`,
    });
  } catch (err: any) {
    console.error('[gov] Claim failed:', err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
});

/**
 * GET /api/governance/info
 * Returns governance on-chain stats (fetched from API).
 */
router.get('/info', async (_req, res) => {
  try {
    const baseUrl = `${config.aleoApiUrl}/program/${GOV_PROGRAM}/mapping`;

    const [supplyRaw, countRaw] = await Promise.all([
      fetchMapping(baseUrl, 'governance_token_supply', '0u8'),
      fetchMapping(baseUrl, 'proposal_count', '0u8'),
    ]);

    return res.json({
      tokenSupply: parseU64(supplyRaw),
      proposalCount: parseU64(countRaw),
      claimAmount: CLAIM_AMOUNT,
      cooldownMs: CLAIM_COOLDOWN_MS,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch governance info' });
  }
});

async function fetchMapping(baseUrl: string, mapping: string, key: string): Promise<string | null> {
  try {
    const resp = await fetch(`${baseUrl}/${mapping}/${key}`);
    if (!resp.ok) return null;
    const text = await resp.text();
    return text.replace(/"/g, '').trim() || null;
  } catch {
    return null;
  }
}

function parseU64(raw: string | null): number {
  if (!raw) return 0;
  return parseInt(raw.replace(/u64|\.public|\.private/g, '').trim(), 10) || 0;
}

export default router;
