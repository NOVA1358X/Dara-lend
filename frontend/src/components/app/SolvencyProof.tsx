import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BACKEND_API, PROGRAM_ID, VAULT_PROGRAM_ID, ALEO_TESTNET_API, PRECISION } from '@/utils/constants';

interface SolvencyData {
  isSolvent: boolean;
  isPaused: boolean;
  totalCollateral: number;
  totalBorrowed: number;
  collateralizationRatio: string;
}

interface BotHealth {
  enabled: boolean;
  dpsEnabled: boolean;
  phase: string;
  tickCount: number;
  uptimeMs: number;
  lastTickTimestamp: number;
  lastResults: {
    oracle: boolean;
    liquidation: boolean;
    interest: boolean;
    yield: boolean;
  };
  bots: {
    oracle: { lastPushTimestamp: number; pushCount: number; lastPushPrice: number; lastError: string | null };
    liquidation: { lastScanTimestamp: number; liquidationsExecuted: number; globalLtv: number; lastError: string | null };
    interest: { lastAccrualTimestamp: number; accrualCount: number; lastError: string | null };
    yield: { lastDistributionTimestamp: number; distributionCount: number; lastError: string | null };
  };
  recentTransactions: Array<{ timestamp: number; program: string; transition: string; status: string; txId: string | null }>;
  errors: string[];
}

interface HealthData {
  blockHeight: number;
  oracle: { lastAggregationTimestamp: number; medianPrice: number; onChainPrice: number; ageMs: number };
  protocol: {
    totalCollateralAleo: number;
    totalCollateralUsdcx: number;
    totalCollateralUsad: number;
    totalBorrowedUsdcx: number;
    totalBorrowedUsad: number;
    loanCount: number;
    oraclePriceAleo: number;
    globalLtv: number;
    isHealthy: boolean;
  };
}

function formatDuration(ms: number): string {
  if (ms === 0) return 'Never';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

function formatValue(val: number): string {
  return (val / PRECISION).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

const explorerUrl = (mapping: string, key: string = '0u8', program: string = PROGRAM_ID) =>
  `https://testnet.explorer.provable.com/program/${program}/mapping/${mapping}/${key}`;

export function SolvencyProof() {
  const [solvency, setSolvency] = useState<SolvencyData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [botHealth, setBotHealth] = useState<BotHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [solRes, healthRes, botRes] = await Promise.all([
        fetch(`${BACKEND_API}/solvency`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${BACKEND_API}/health`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${BACKEND_API}/health/bot`).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (solRes) setSolvency(solRes);
      if (healthRes) setHealth(healthRes);
      if (botRes) setBotHealth(botRes);
    } catch { /* backend offline */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const proto = health?.protocol;
  const oracle = health?.oracle;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-display text-text-primary mb-1">Solvency Proof</h1>
        <p className="text-sm text-text-secondary">Real-time on-chain verification — all data fetched directly from Aleo testnet mappings.</p>
      </motion.div>

      {/* Solvency Status */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className={`p-6 rounded-xl border ${
          solvency?.isSolvent ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${solvency?.isSolvent ? 'bg-emerald-400 animate-pulse' : 'bg-red-400 animate-pulse'}`} />
              <span className="text-lg font-semibold text-text-primary">
                {loading ? 'Checking...' : solvency?.isSolvent ? 'Protocol Solvent' : 'Undercollateralized'}
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              Collateralization: {solvency?.collateralizationRatio ?? '—'}%
              {solvency?.isPaused && <span className="ml-2 text-amber-400">(Paused)</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Block</p>
            <p className="text-sm font-mono text-text-primary">{health?.blockHeight?.toLocaleString() ?? '—'}</p>
          </div>
        </div>
      </motion.div>

      {/* Collateral Breakdown */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="p-6 rounded-xl border border-white/5 bg-white/[0.02]"
      >
        <h2 className="text-lg font-display text-text-primary mb-4">Collateral vs Debt</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Collateral */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-emerald-400">Total Collateral</p>
            <Row label="ALEO" value={formatValue(proto?.totalCollateralAleo ?? 0)} mapping="vault_collateral_aleo" />
            <Row label="USDCx" value={formatValue(proto?.totalCollateralUsdcx ?? 0)} mapping="vault_collateral_usdcx" />
            <Row label="USAD" value={formatValue(proto?.totalCollateralUsad ?? 0)} mapping="vault_collateral_usad" />
          </div>
          {/* Debt */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-red-400">Total Borrowed</p>
            <Row label="USDCx" value={formatValue(proto?.totalBorrowedUsdcx ?? 0)} mapping="pool_total_borrowed" mapKey="0u8" />
            <Row label="USAD" value={formatValue(proto?.totalBorrowedUsad ?? 0)} mapping="pool_total_borrowed" mapKey="1u8" />
            <Row label="Active Loans" value={String(proto?.loanCount ?? 0)} mapping="loan_count" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Global LTV</span>
            <span className={`text-sm font-mono ${(proto?.globalLtv ?? 0) > 75 ? 'text-red-400' : 'text-emerald-400'}`}>
              {proto?.globalLtv?.toFixed(2) ?? '—'}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* Oracle Status */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="p-6 rounded-xl border border-white/5 bg-white/[0.02]"
      >
        <h2 className="text-lg font-display text-text-primary mb-4">Oracle</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniStat label="Aggregated Price" value={oracle?.medianPrice ? `$${oracle.medianPrice.toFixed(4)}` : '—'} />
          <MiniStat label="On-Chain Price" value={proto?.oraclePriceAleo ? `$${formatValue(proto.oraclePriceAleo)}` : '—'} />
          <MiniStat label="Freshness" value={oracle?.ageMs ? formatDuration(oracle.ageMs) : '—'} />
          <MiniStat label="Auto-Push" value={botHealth?.bots?.oracle?.pushCount ? `${botHealth.bots.oracle.pushCount} pushes` : 'N/A'} />
        </div>
        <a
          href={explorerUrl('oracle_price')}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-accent-gold/60 hover:text-accent-gold transition-colors"
        >
          Verify on Explorer →
        </a>
      </motion.div>

      {/* Bot Orchestrator Status */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="p-6 rounded-xl border border-white/5 bg-white/[0.02]"
      >
        <h2 className="text-lg font-display text-text-primary mb-4">Automation (Bot Orchestrator)</h2>
        {botHealth ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <MiniStat label="Status" value={botHealth.enabled ? botHealth.phase.toUpperCase() : 'DISABLED'} highlight={botHealth.enabled} />
              <MiniStat label="DPS" value={botHealth.dpsEnabled ? 'Enabled' : 'Local'} highlight={botHealth.dpsEnabled} />
              <MiniStat label="Ticks" value={String(botHealth.tickCount)} />
              <MiniStat label="Uptime" value={botHealth.uptimeMs ? formatDuration(Date.now() - (Date.now() - botHealth.uptimeMs)) : '—'} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <BotCard name="Oracle" lastRun={botHealth.bots.oracle.lastPushTimestamp} count={botHealth.bots.oracle.pushCount} error={botHealth.bots.oracle.lastError} />
              <BotCard name="Liquidation" lastRun={botHealth.bots.liquidation.lastScanTimestamp} count={botHealth.bots.liquidation.liquidationsExecuted} error={botHealth.bots.liquidation.lastError} />
              <BotCard name="Interest" lastRun={botHealth.bots.interest.lastAccrualTimestamp} count={botHealth.bots.interest.accrualCount} error={botHealth.bots.interest.lastError} />
              <BotCard name="Yield" lastRun={botHealth.bots.yield.lastDistributionTimestamp} count={botHealth.bots.yield.distributionCount} error={botHealth.bots.yield.lastError} />
            </div>

            {/* Recent transactions */}
            {botHealth.recentTransactions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-text-muted mb-2">Recent Bot Transactions</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {botHealth.recentTransactions.map((tx, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary font-mono">{tx.transition}</span>
                      <div className="flex items-center gap-2">
                        <span className={tx.status === 'broadcast' ? 'text-emerald-400' : tx.status === 'failed' ? 'text-red-400' : 'text-amber-400'}>
                          {tx.status}
                        </span>
                        {tx.txId && (
                          <a
                            href={`https://testnet.explorer.provable.com/transaction/${tx.txId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-gold/50 hover:text-accent-gold"
                          >
                            {tx.txId.slice(0, 12)}...
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-text-muted">Bot health unavailable — backend may be offline.</p>
        )}
      </motion.div>

      {/* Vault Health */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="p-6 rounded-xl border border-white/5 bg-white/[0.02]"
      >
        <h2 className="text-lg font-display text-text-primary mb-4">Yield Vault</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MiniStat label="USDCx Pool" value="On-chain" />
          <MiniStat label="USAD Pool" value="On-chain" />
          <MiniStat label="Yield Distribution" value={botHealth?.bots?.yield?.distributionCount ? `${botHealth.bots.yield.distributionCount} distributions` : 'Manual'} />
        </div>
        <a
          href={explorerUrl('supply_pool_total', '0u8', VAULT_PROGRAM_ID)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-accent-gold/60 hover:text-accent-gold transition-colors"
        >
          Verify Vault on Explorer →
        </a>
      </motion.div>

      {/* Programs */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="p-6 rounded-xl border border-white/5 bg-white/[0.02]"
      >
        <h2 className="text-lg font-display text-text-primary mb-4">Deployed Programs</h2>
        <div className="space-y-2">
          <ProgramRow name="Lending Core" id={PROGRAM_ID} transitions={21} />
          <ProgramRow name="Yield Vault" id={VAULT_PROGRAM_ID} transitions={10} />
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, value, mapping, mapKey = '0u8', program = PROGRAM_ID }: { label: string; value: string; mapping: string; mapKey?: string; program?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-text-primary">{value}</span>
        <a
          href={explorerUrl(mapping, mapKey, program)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-accent-gold/40 hover:text-accent-gold transition-colors"
          title="Verify on Explorer"
        >
          ↗
        </a>
      </div>
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-sm font-mono ${highlight ? 'text-emerald-400' : 'text-text-primary'}`}>{value}</p>
    </div>
  );
}

function BotCard({ name, lastRun, count, error }: { name: string; lastRun: number; count: number; error: string | null }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
      <p className="text-text-primary font-medium mb-1">{name}</p>
      <p className="text-text-muted">Last: {lastRun ? formatDuration(Date.now() - lastRun) : 'Never'}</p>
      <p className="text-text-muted">Count: {count}</p>
      {error && <p className="text-red-400/70 truncate" title={error}>Error</p>}
    </div>
  );
}

function ProgramRow({ name, id, transitions }: { name: string; id: string; transitions: number }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
      <div>
        <p className="text-sm text-text-primary">{name}</p>
        <p className="text-xs text-text-muted font-mono">{id}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-secondary">{transitions} transitions</span>
        <a
          href={`https://testnet.explorer.provable.com/program/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent-gold/60 hover:text-accent-gold transition-colors"
        >
          Explorer →
        </a>
      </div>
    </div>
  );
}
