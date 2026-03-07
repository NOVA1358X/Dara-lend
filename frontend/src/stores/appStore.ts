import { create } from 'zustand';

export type TransactionStep = 'idle' | 'encrypting' | 'proving' | 'broadcasting' | 'confirmed' | 'failed';

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  transactionPending: boolean;
  transactionStep: TransactionStep;
  transactionId: string | null;
  setTransactionPending: (pending: boolean) => void;
  setTransactionStep: (step: TransactionStep) => void;
  setTransactionId: (id: string | null) => void;
  resetTransaction: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  transactionPending: false,
  transactionStep: 'idle',
  transactionId: null,
  setTransactionPending: (pending) => set({ transactionPending: pending }),
  setTransactionStep: (step) => set({ transactionStep: step }),
  setTransactionId: (id) => set({ transactionId: id }),
  resetTransaction: () =>
    set({
      transactionPending: false,
      transactionStep: 'idle',
      transactionId: null,
    }),
}));
