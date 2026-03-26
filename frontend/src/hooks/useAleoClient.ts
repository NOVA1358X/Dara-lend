import { useCallback } from 'react';
import { ALEO_TESTNET_API, PROGRAM_ID, MAPPING_KEYS } from '@/utils/constants';

export function useAleoClient() {
  const getMappingValue = useCallback(
    async (mapping: string, key: string = MAPPING_KEYS.GLOBAL, programId: string = PROGRAM_ID): Promise<string | null> => {
      try {
        const url = `${ALEO_TESTNET_API}/program/${programId}/mapping/${mapping}/${key}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const text = await response.text();
        if (!text || text === 'null' || text === '') return null;
        return text.replace(/"/g, '');
      } catch {
        return null;
      }
    },
    [],
  );

  const getTransaction = useCallback(async (txId: string) => {
    try {
      const url = `${ALEO_TESTNET_API}/transaction/${txId}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }, []);

  const getLatestBlockHeight = useCallback(async (): Promise<number | null> => {
    try {
      const url = `${ALEO_TESTNET_API}/latest/height`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const text = await response.text();
      return parseInt(text, 10) || null;
    } catch {
      return null;
    }
  }, []);

  return { getMappingValue, getTransaction, getLatestBlockHeight };
}
