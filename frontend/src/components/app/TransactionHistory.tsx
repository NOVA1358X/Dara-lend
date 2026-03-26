import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EmptyState } from '@/components/shared/EmptyState';

export interface TxHistoryEntry {
  type: string;
  txId: string;
  timestamp: number;
  status: 'confirmed' | 'failed' | 'pending';
}

const TX_HISTORY_KEY = 'dara_tx_history';
const EXPLORER_BASE = 'https://testnet.explorer.provable.com/transaction';

export function saveTxToHistory(entry: TxHistoryEntry): void {
  try {
    const raw = localStorage.getItem(TX_HISTORY_KEY);
    const list: TxHistoryEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    // Keep last 50
    localStorage.setItem(TX_HISTORY_KEY, JSON.stringify(list.slice(0, 50)));
  } catch { /* ignore */ }
}

export function getTxHistory(): TxHistoryEntry[] {
  try {
    const raw = localStorage.getItem(TX_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const typeLabels: Record<string, string> = {
  supply_collateral: 'Supply Collateral',
  borrow: 'Borrow USDCx',
  repay: 'Repay Debt',
  withdraw_collateral: 'Withdraw',
  liquidate: 'Liquidate',
  update_oracle_price: 'Oracle Update',
  approve_public: 'Approve USDCx',
  transfer_public: 'Fund Protocol',
};

export function TransactionHistory() {
  const [history, setHistory] = useState<TxHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getTxHistory());
  }, []);

  const clearHistory = () => {
    localStorage.removeItem(TX_HISTORY_KEY);
    setHistory([]);
  };

  if (history.length === 0) {
    return (
      <div className="max-w-[640px] mx-auto">
        <EmptyState
          title="No transactions yet"
          description="Your transaction history will appear here after you supply, borrow, repay, or withdraw."
        />
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-secondary">{history.length} transactions</p>
        <button
          onClick={clearHistory}
          className="text-xs text-text-muted hover:text-red-400 transition-colors"
        >
          Clear History
        </button>
      </div>

      <div className="space-y-2">
        {history.map((tx, idx) => (
          <motion.div
            key={tx.txId + idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="rounded-xl glass-panel-sm p-4 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  tx.status === 'confirmed' ? 'bg-accent-success' :
                  tx.status === 'failed' ? 'bg-red-500' : 'bg-yellow-400'
                }`} />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {typeLabels[tx.type] || tx.type}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {new Date(tx.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  tx.status === 'confirmed' ? 'bg-[rgba(52,211,153,0.1)] text-accent-success' :
                  tx.status === 'failed' ? 'bg-[rgba(239,68,68,0.1)] text-red-400' :
                  'bg-[rgba(250,204,21,0.1)] text-yellow-400'
                }`}>
                  {tx.status}
                </span>
                <a
                  href={`${EXPLORER_BASE}/${tx.txId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
                  title={tx.txId}
                >
                  {tx.txId.slice(0, 16)}...
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
