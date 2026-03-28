import { useProtocolStats, useOraclePrice } from '@/hooks/useProtocolStats';
import { useMarketPrice } from '@/hooks/useMarketPrice';
import { useAleoClient } from '@/hooks/useAleoClient';
import { PRECISION, MAPPINGS } from '@/utils/constants';
import { parseAleoU64 } from '@/utils/formatting';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

export function OracleStatus() {
  const { price: livePrice } = useMarketPrice();
  const { data: oraclePrice } = useOraclePrice();
  const { getMappingValue } = useAleoClient();

  const { data: updateBlock } = useQuery<number>({
    queryKey: ['priceUpdateBlock'],
    queryFn: async () => {
      const raw = await getMappingValue(MAPPINGS.PRICE_UPDATE_BLOCK);
      return parseAleoU64(raw || '0');
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: latestBlock } = useQuery<number>({
    queryKey: ['latestBlock'],
    queryFn: async () => {
      const raw = await getMappingValue('latest_block_proxy');
      // Fallback: just return 0, block freshness is a bonus
      return parseAleoU64(raw || '0');
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: false,
  });

  const onChainUsd = oraclePrice ? oraclePrice / PRECISION : null;
  const deviation =
    onChainUsd && livePrice
      ? Math.abs((onChainUsd - livePrice) / livePrice) * 100
      : null;

  const isStale = deviation !== null && deviation > 5;
  const isFresh = deviation !== null && deviation <= 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className="rounded-xl glass-panel p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-primary">sensors</span>
          <h3 className="font-headline text-base text-text-primary">
            Oracle Price Feed
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isFresh
                ? 'bg-accent-success animate-pulse'
                : isStale
                  ? 'bg-accent-danger animate-pulse'
                  : 'bg-yellow-400'
            }`}
          />
          <span className="text-xs text-text-muted">
            {isFresh ? 'Live' : isStale ? 'Stale' : 'Syncing'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* On-chain price */}
        <div className="p-3 rounded-lg bg-white/[0.03]">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
            On-Chain Oracle
          </p>
          <p className="font-mono text-lg font-bold text-text-primary tabular-nums">
            {onChainUsd ? `$${onChainUsd.toFixed(4)}` : '—'}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">
            Verified on Aleo
          </p>
        </div>

        {/* Market price */}
        <div className="p-3 rounded-lg bg-white/[0.03]">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
            Market Price
          </p>
          <p className="font-mono text-lg font-bold text-text-primary tabular-nums">
            {livePrice ? `$${livePrice.toFixed(4)}` : '—'}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">
            CoinGecko + CryptoCompare + Coinbase + Gate.io
          </p>
        </div>
      </div>

      {/* Deviation indicator */}
      {deviation !== null && (
        <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03]">
          <span className="text-xs text-text-muted">Deviation</span>
          <span
            className={`text-xs font-mono font-medium ${
              deviation <= 1
                ? 'text-accent-success'
                : deviation <= 3
                  ? 'text-yellow-400'
                  : 'text-accent-danger'
            }`}
          >
            {deviation.toFixed(2)}%
          </span>
        </div>
      )}

      {/* Oracle features list */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="text-accent-success">✓</span>
          <span>5-source median: CoinGecko + CryptoCompare + Coinbase + Gate.io + CMC</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="text-accent-success">✓</span>
          <span>On-chain deviation cap (15%) + no staleness lockout</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="text-accent-success">✓</span>
          <span>Round-based replay protection + min update interval</span>
        </div>
      </div>
    </motion.div>
  );
}
