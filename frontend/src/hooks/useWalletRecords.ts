import { useQuery } from '@tanstack/react-query';
import { PROGRAM_ID, CREDITS_PROGRAM } from '@/utils/constants';
import { parseRecord, DaraRecord, filterRecordsByType, CollateralReceiptRecord, DebtPositionRecord, RepaymentReceiptRecord } from '@/utils/records';

interface WalletHook {
  requestRecords?: (program: string) => Promise<unknown[]>;
  connected: boolean;
}

export function useWalletRecords(wallet: WalletHook) {
  const daraRecordsQuery = useQuery<DaraRecord[]>({
    queryKey: ['daraRecords', wallet.connected],
    queryFn: async () => {
      if (!wallet.connected || !wallet.requestRecords) return [];
      try {
        const rawRecords = await wallet.requestRecords(PROGRAM_ID);
        console.log('[DARA] Raw records from wallet:', JSON.stringify(rawRecords, null, 2));
        const parsed = rawRecords
          .map((r) => parseRecord(r as Record<string, unknown>))
          .filter((r): r is DaraRecord => r !== null);
        console.log('[DARA] Parsed records:', parsed);
        return parsed;
      } catch {
        return [];
      }
    },
    enabled: wallet.connected,
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  const creditsQuery = useQuery<unknown[]>({
    queryKey: ['creditsRecords', wallet.connected],
    queryFn: async () => {
      if (!wallet.connected || !wallet.requestRecords) return [];
      try {
        return await wallet.requestRecords(CREDITS_PROGRAM);
      } catch {
        return [];
      }
    },
    enabled: wallet.connected,
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  const allRecords = daraRecordsQuery.data || [];

  const collateralReceipts = filterRecordsByType<CollateralReceiptRecord>(
    allRecords,
    'CollateralReceipt',
  );

  const debtPositions = filterRecordsByType<DebtPositionRecord>(
    allRecords,
    'DebtPosition',
  );

  const repaymentReceipts = filterRecordsByType<RepaymentReceiptRecord>(
    allRecords,
    'RepaymentReceipt',
  );

  return {
    allRecords,
    collateralReceipts,
    debtPositions,
    repaymentReceipts,
    creditsRecords: creditsQuery.data || [],
    isLoading: daraRecordsQuery.isLoading || creditsQuery.isLoading,
    refetch: () => {
      daraRecordsQuery.refetch();
      creditsQuery.refetch();
    },
  };
}
