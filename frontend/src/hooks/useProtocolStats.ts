import { useQuery } from '@tanstack/react-query';
import { useAleoClient } from './useAleoClient';
import { MAPPINGS, REFETCH_INTERVAL } from '@/utils/constants';
import { parseAleoU64 } from '@/utils/formatting';

export interface ProtocolStats {
  totalCollateral: number;
  totalBorrowed: number;
  loanCount: number;
  oraclePrice: number;
  utilizationRate: number;
}

export function useProtocolStats() {
  const { getMappingValue } = useAleoClient();

  return useQuery<ProtocolStats>({
    queryKey: ['protocolStats'],
    queryFn: async () => {
      const [collateralRaw, borrowedRaw, loansRaw, priceRaw] =
        await Promise.all([
          getMappingValue(MAPPINGS.VAULT_COLLATERAL_ALEO),
          getMappingValue(MAPPINGS.POOL_TOTAL_BORROWED, '0u8'),
          getMappingValue(MAPPINGS.LOAN_COUNT),
          getMappingValue(MAPPINGS.ORACLE_PRICE),
        ]);

      const totalCollateral = parseAleoU64(collateralRaw || '0');
      const totalBorrowed = parseAleoU64(borrowedRaw || '0');
      const loanCount = parseAleoU64(loansRaw || '0');
      const oraclePrice = parseAleoU64(priceRaw || '0');

      const utilizationRate =
        totalCollateral > 0 ? totalBorrowed / totalCollateral : 0;

      return {
        totalCollateral,
        totalBorrowed,
        loanCount,
        oraclePrice,
        utilizationRate,
      };
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 10_000,
  });
}

export function useOraclePrice() {
  const { getMappingValue } = useAleoClient();

  return useQuery<number>({
    queryKey: ['oraclePrice'],
    queryFn: async () => {
      const raw = await getMappingValue(MAPPINGS.ORACLE_PRICE);
      return parseAleoU64(raw || '0');
    },
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 10_000,
  });
}
