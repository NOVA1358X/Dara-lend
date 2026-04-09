import { useQuery } from '@tanstack/react-query';
import { useAleoClient } from './useAleoClient';
import { MAPPINGS, CREDITS_MAPPINGS, CREDITS_PROGRAM_ID, REFETCH_INTERVAL, PRECISION } from '@/utils/constants';
import { parseAleoU64 } from '@/utils/formatting';

export interface ProtocolStats {
  totalCollateral: number;
  totalCollateralAleo: number;
  totalCollateralUsdcx: number;
  totalCollateralUsad: number;
  totalBorrowed: number;
  totalBorrowedUsdcx: number;
  totalBorrowedUsad: number;
  totalBorrowedAleo: number;
  loanCount: number;
  oraclePrice: number;
  utilizationRate: number;
}

export function useProtocolStats() {
  const { getMappingValue } = useAleoClient();

  return useQuery<ProtocolStats>({
    queryKey: ['protocolStats'],
    queryFn: async () => {
      const [
        collateralAleoRaw, collateralUsdcxRaw, collateralUsadRaw,
        borrowedUsdcxRaw, borrowedUsadRaw, borrowedAleoRaw,
        loansRaw, creditsLoansRaw, priceRaw,
      ] = await Promise.all([
          getMappingValue(MAPPINGS.VAULT_COLLATERAL_ALEO),
          getMappingValue(CREDITS_MAPPINGS.VAULT_COLLATERAL_USDCX, '0u8', CREDITS_PROGRAM_ID),
          getMappingValue(CREDITS_MAPPINGS.VAULT_COLLATERAL_USAD, '0u8', CREDITS_PROGRAM_ID),
          getMappingValue(MAPPINGS.POOL_TOTAL_BORROWED, '0u8'),
          getMappingValue(MAPPINGS.POOL_TOTAL_BORROWED, '1u8'),
          getMappingValue(CREDITS_MAPPINGS.POOL_TOTAL_BORROWED, '0u8', CREDITS_PROGRAM_ID),
          getMappingValue(MAPPINGS.LOAN_COUNT),
          getMappingValue(CREDITS_MAPPINGS.LOAN_COUNT, '0u8', CREDITS_PROGRAM_ID),
          getMappingValue(MAPPINGS.ORACLE_PRICE),
        ]);

      const totalCollateralAleo = parseAleoU64(collateralAleoRaw || '0');
      const totalCollateralUsdcx = parseAleoU64(collateralUsdcxRaw || '0');
      const totalCollateralUsad = parseAleoU64(collateralUsadRaw || '0');
      const totalBorrowedUsdcx = parseAleoU64(borrowedUsdcxRaw || '0');
      const totalBorrowedUsad = parseAleoU64(borrowedUsadRaw || '0');
      const totalBorrowedAleo = parseAleoU64(borrowedAleoRaw || '0');
      const oraclePrice = parseAleoU64(priceRaw || '0');
      // Sum loan_count from both contracts (each has its own mapping)
      const loanCount = parseAleoU64(loansRaw || '0') + parseAleoU64(creditsLoansRaw || '0');

      // Total collateral value in USD (microdollars): ALEO valued at oracle price, stablecoins at $1
      const aleoPrice = oraclePrice || PRECISION;
      const totalCollateral = Math.floor((totalCollateralAleo * aleoPrice) / PRECISION)
        + totalCollateralUsdcx + totalCollateralUsad;

      // Total borrowed value in USD: USDCx/USAD at $1, ALEO at oracle price
      const totalBorrowed = totalBorrowedUsdcx + totalBorrowedUsad
        + Math.floor((totalBorrowedAleo * aleoPrice) / PRECISION);

      const utilizationRate =
        totalCollateral > 0 ? totalBorrowed / totalCollateral : 0;

      return {
        totalCollateral,
        totalCollateralAleo,
        totalCollateralUsdcx,
        totalCollateralUsad,
        totalBorrowed,
        totalBorrowedUsdcx,
        totalBorrowedUsad,
        totalBorrowedAleo,
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
