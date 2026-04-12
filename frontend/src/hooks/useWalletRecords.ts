import { useQuery } from '@tanstack/react-query';
import { PROGRAM_ID, CREDITS_PROGRAM_ID, CREDITS_PROGRAM, USDCX_PROGRAM, USAD_PROGRAM, TEST_BTC_PROGRAM, TEST_ETH_PROGRAM, TEST_SOL_PROGRAM } from '@/utils/constants';
import { parseRecord, DaraRecord, filterRecordsByType, getConsumedSet, CollateralReceiptRecord, DebtPositionRecord, RepaymentReceiptRecord, LiquidationAuthRecord, LiquidationReceiptRecord } from '@/utils/records';

interface WalletHook {
  requestRecords?: (program: string, includePlaintext?: boolean) => Promise<unknown[]>;
  decrypt?: (cipherText: string) => Promise<string>;
  connected: boolean;
}

/**
 * Try to decrypt a record's ciphertext and re-parse it with the plaintext.
 * Returns the decrypted plaintext or null if decryption is unavailable/fails.
 */
async function tryDecryptRecord(
  record: Record<string, unknown>,
  decrypt?: (cipherText: string) => Promise<string>,
): Promise<string | null> {
  const ciphertext = record.recordCiphertext as string | undefined;
  if (!ciphertext || !decrypt) return null;
  try {
    return await decrypt(ciphertext);
  } catch {
    return null;
  }
}

export function useWalletRecords(wallet: WalletHook) {
  const daraRecordsQuery = useQuery<DaraRecord[]>({
    queryKey: ['daraRecords', wallet.connected],
    queryFn: async () => {
      if (!wallet.connected || !wallet.requestRecords) return [];
      try {
        // Fetch records from both programs — CollateralReceipt for USDCx/USAD
        // is issued by dara_lend_v8_credits.aleo, while ALEO collateral is in dara_lend_v8.aleo
        const [mainRaw, creditsRaw] = await Promise.all([
          wallet.requestRecords(PROGRAM_ID, true).catch(() => [] as unknown[]),
          wallet.requestRecords(CREDITS_PROGRAM_ID, true).catch(() => [] as unknown[]),
        ]);
        const rawRecords = [...mainRaw, ...creditsRaw];
        console.log('[DARA] Raw records from wallet:', JSON.stringify(rawRecords, null, 2));

        const parsed: DaraRecord[] = [];

        for (const r of rawRecords) {
          const raw = r as Record<string, unknown>;

          // Phase 1: Try parsing with available data/recordPlaintext/plaintext
          let record = parseRecord(raw);

          // Check if the record was detected but has empty values
          // (recordName matched but data fields weren't extracted)
          const needsDecrypt = record && hasEmptyValues(record);

          if (!record || needsDecrypt) {
            // Phase 2: Decrypt the ciphertext and re-parse
            const decryptedPlaintext = await tryDecryptRecord(raw, wallet.decrypt);
            if (decryptedPlaintext) {
              console.log('[DARA] Decrypted record plaintext:', decryptedPlaintext);
              // Also store as recordPlaintext so it's available for transaction inputs
              raw.recordPlaintext = decryptedPlaintext;
              const reParsed = parseRecord(raw, decryptedPlaintext);
              if (reParsed) record = reParsed;
            }
          }

          if (record) parsed.push(record);
        }

        // Mark records as spent if they're in our consumed set (localStorage)
        const consumed = getConsumedSet();
        for (const record of parsed) {
          if (!record.spent) {
            const commitment = (record.raw.commitment as string) || '';
            if (commitment && consumed.has(commitment)) {
              record.spent = true;
              console.log('[DARA] Marking record as consumed (localStorage):', commitment.slice(0, 20) + '...');
            }
          }
        }

        console.log('[DARA] Parsed records:', parsed);
        return parsed;
      } catch (e) {
        const msg = (e as Error)?.message || String(e);
        if (msg.includes('not allowed') || msg.includes('not authorized')) {
          // Wallet hasn't synced the program yet — this is expected right after deploy
          console.warn('[DARA] Wallet has not synced program records yet. This is normal for newly deployed programs — try disconnecting and reconnecting your wallet.');
        } else {
          console.error('[DARA] Error fetching records:', e);
        }
        return [];
      }
    },
    enabled: wallet.connected,
    refetchInterval: 30_000, // slower poll to reduce noise when program isn't synced
    staleTime: 5_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const creditsQuery = useQuery<unknown[]>({
    queryKey: ['creditsRecords', wallet.connected],
    queryFn: async () => {
      if (!wallet.connected || !wallet.requestRecords) return [];
      try {
        return await wallet.requestRecords(CREDITS_PROGRAM, true);
      } catch {
        return [];
      }
    },
    enabled: wallet.connected,
    refetchInterval: 15_000,
    staleTime: 5_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const usdcxQuery = useQuery<unknown[]>({
    queryKey: ['usdcxRecords', wallet.connected],
    queryFn: async () => {
      if (!wallet.connected || !wallet.requestRecords) return [];
      try {
        return await wallet.requestRecords(USDCX_PROGRAM, true);
      } catch {
        return [];
      }
    },
    enabled: wallet.connected,
    refetchInterval: 15_000,
    staleTime: 5_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const usadQuery = useQuery<unknown[]>({
    queryKey: ['usadRecords', wallet.connected],
    queryFn: async () => {
      if (!wallet.connected || !wallet.requestRecords) return [];
      try {
        return await wallet.requestRecords(USAD_PROGRAM, true);
      } catch {
        return [];
      }
    },
    enabled: wallet.connected,
    refetchInterval: 15_000,
    staleTime: 5_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const btcQuery = useQuery<unknown[]>({
    queryKey: ['btcRecords', wallet.connected],
    queryFn: async () => {
      if (!wallet.connected || !wallet.requestRecords) return [];
      try {
        return await wallet.requestRecords(TEST_BTC_PROGRAM, true);
      } catch {
        return [];
      }
    },
    enabled: wallet.connected,
    refetchInterval: 15_000,
    staleTime: 5_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const ethQuery = useQuery<unknown[]>({
    queryKey: ['ethRecords', wallet.connected],
    queryFn: async () => {
      if (!wallet.connected || !wallet.requestRecords) return [];
      try {
        return await wallet.requestRecords(TEST_ETH_PROGRAM, true);
      } catch {
        return [];
      }
    },
    enabled: wallet.connected,
    refetchInterval: 15_000,
    staleTime: 5_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const solQuery = useQuery<unknown[]>({
    queryKey: ['solRecords', wallet.connected],
    queryFn: async () => {
      if (!wallet.connected || !wallet.requestRecords) return [];
      try {
        return await wallet.requestRecords(TEST_SOL_PROGRAM, true);
      } catch {
        return [];
      }
    },
    enabled: wallet.connected,
    refetchInterval: 15_000,
    staleTime: 5_000,
    retry: false,
    refetchOnWindowFocus: false,
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

  const liquidationAuths = filterRecordsByType<LiquidationAuthRecord>(
    allRecords,
    'LiquidationAuth',
  );

  const liquidationReceipts = filterRecordsByType<LiquidationReceiptRecord>(
    allRecords,
    'LiquidationReceipt',
  );

  return {
    allRecords,
    collateralReceipts,
    debtPositions,
    repaymentReceipts,
    liquidationAuths,
    liquidationReceipts,
    creditsRecords: creditsQuery.data || [],
    usdcxRecords: usdcxQuery.data || [],
    usadRecords: usadQuery.data || [],
    btcRecords: btcQuery.data || [],
    ethRecords: ethQuery.data || [],
    solRecords: solQuery.data || [],
    isLoading: daraRecordsQuery.isLoading || creditsQuery.isLoading,
    refetch: () => {
      daraRecordsQuery.refetch();
      creditsQuery.refetch();
      usdcxQuery.refetch();
      usadQuery.refetch();
      btcQuery.refetch();
      ethQuery.refetch();
      solQuery.refetch();
    },
  };
}

/**
 * Check if a parsed record has empty/zero values indicating
 * the data fields weren't actually extracted.
 */
function hasEmptyValues(record: DaraRecord): boolean {
  switch (record.type) {
    case 'CollateralReceipt':
      return record.collateralAmount === 0;
    case 'DebtPosition':
      return record.collateralAmount === 0 && record.debtAmount === 0;
    case 'LiquidationAuth':
      return record.collateralAmount === 0;
    case 'RepaymentReceipt':
      return record.amountRepaid === 0;
    case 'LiquidationReceipt':
      return record.collateralSeized === 0;
    default:
      return false;
  }
}
