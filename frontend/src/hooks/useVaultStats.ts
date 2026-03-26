import { useQuery } from '@tanstack/react-query';
import { useAleoClient } from './useAleoClient';
import { VAULT_PROGRAM_ID, VAULT_MAPPINGS, REFETCH_INTERVAL, PRECISION, BACKEND_API } from '@/utils/constants';
import { parseAleoU64 } from '@/utils/formatting';

export interface VaultStats {
  poolTotalUsdcx: number;
  poolTotalUsad: number;
  poolSharesUsdcx: number;
  poolSharesUsad: number;
  yieldAccumulatedUsdcx: number;
  yieldAccumulatedUsad: number;
  transferCount: number;
  totalVolume: number;
  depositCountUsdcx: number;
  depositCountUsad: number;
  sharePriceUsdcx: number;
  sharePriceUsad: number;
}

export function useVaultStats() {
  const { getMappingValue } = useAleoClient();

  return useQuery<VaultStats>({
    queryKey: ['vaultStats'],
    queryFn: async () => {
      // Vault contract: token_type 0u8=USDCx, 1u8=USAD
      const [
        poolTotalUsdcxRaw, poolTotalUsadRaw,
        poolSharesUsdcxRaw, poolSharesUsadRaw,
        yieldUsdcxRaw, yieldUsadRaw,
        transferCountRaw, totalVolumeRaw,
        depositCountUsdcxRaw, depositCountUsadRaw,
      ] = await Promise.all([
        getMappingValue(VAULT_MAPPINGS.SUPPLY_POOL_TOTAL, '0u8', VAULT_PROGRAM_ID),
        getMappingValue(VAULT_MAPPINGS.SUPPLY_POOL_TOTAL, '1u8', VAULT_PROGRAM_ID),
        getMappingValue(VAULT_MAPPINGS.SUPPLY_POOL_SHARES, '0u8', VAULT_PROGRAM_ID),
        getMappingValue(VAULT_MAPPINGS.SUPPLY_POOL_SHARES, '1u8', VAULT_PROGRAM_ID),
        getMappingValue(VAULT_MAPPINGS.POOL_YIELD_ACCUMULATED, '0u8', VAULT_PROGRAM_ID),
        getMappingValue(VAULT_MAPPINGS.POOL_YIELD_ACCUMULATED, '1u8', VAULT_PROGRAM_ID),
        getMappingValue(VAULT_MAPPINGS.TRANSFER_COUNT, '0u8', VAULT_PROGRAM_ID),
        getMappingValue(VAULT_MAPPINGS.TOTAL_VOLUME, '0u8', VAULT_PROGRAM_ID),
        getMappingValue(VAULT_MAPPINGS.POOL_DEPOSIT_COUNT, '0u8', VAULT_PROGRAM_ID),
        getMappingValue(VAULT_MAPPINGS.POOL_DEPOSIT_COUNT, '1u8', VAULT_PROGRAM_ID),
      ]);

      const poolTotalUsdcx = parseAleoU64(poolTotalUsdcxRaw || '0');
      const poolTotalUsad = parseAleoU64(poolTotalUsadRaw || '0');
      const poolSharesUsdcx = parseAleoU64(poolSharesUsdcxRaw || '0');
      const poolSharesUsad = parseAleoU64(poolSharesUsadRaw || '0');
      const yieldAccumulatedUsdcx = parseAleoU64(yieldUsdcxRaw || '0');
      const yieldAccumulatedUsad = parseAleoU64(yieldUsadRaw || '0');
      const transferCount = parseAleoU64(transferCountRaw || '0');
      const totalVolume = parseAleoU64(totalVolumeRaw || '0');
      const depositCountUsdcx = parseAleoU64(depositCountUsdcxRaw || '0');
      const depositCountUsad = parseAleoU64(depositCountUsadRaw || '0');

      // Share price: total_deposits / total_shares (or 1.0 if no shares)
      const sharePriceUsdcx = poolSharesUsdcx > 0
        ? (poolTotalUsdcx / poolSharesUsdcx)
        : 1;
      const sharePriceUsad = poolSharesUsad > 0
        ? (poolTotalUsad / poolSharesUsad)
        : 1;

      return {
        poolTotalUsdcx,
        poolTotalUsad,
        poolSharesUsdcx,
        poolSharesUsad,
        yieldAccumulatedUsdcx,
        yieldAccumulatedUsad,
        transferCount,
        totalVolume,
        depositCountUsdcx,
        depositCountUsad,
        sharePriceUsdcx,
        sharePriceUsad,
      };
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 10_000,
  });
}

export interface MultiAssetPrices {
  aleo: number;
  usdcx: number;
  usad: number;
}

export function useMultiAssetPrices() {
  return useQuery<MultiAssetPrices>({
    queryKey: ['multiAssetPrices'],
    queryFn: async () => {
      try {
        const res = await fetch(`${BACKEND_API}/analytics/multi-price`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        const precision = data.precision || PRECISION;
        const assets: { tokenId: number; price: number }[] = data.assets || [];
        const findPrice = (id: number) => {
          const a = assets.find((x) => x.tokenId === id);
          return a ? a.price / precision : 0;
        };
        return {
          aleo: findPrice(0),
          usdcx: findPrice(1) || 1,
          usad: findPrice(2) || 1,
        };
      } catch {
        return { aleo: 0, usdcx: 1, usad: 1 };
      }
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}
