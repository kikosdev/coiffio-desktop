import { create } from 'zustand';
import { api, ApiError } from '../lib/api';
import { salonDateKey } from '../lib/time';

export type CaisseEntryKind = 'opening' | 'sale' | 'refund' | 'movement' | 'closing';
export type CashMovementType = 'in' | 'out';
export type CashMovementReason = 'apport' | 'retrait' | 'achat' | 'avance' | 'autre';

export const MOVEMENT_REASONS: CashMovementReason[] = ['apport', 'retrait', 'achat', 'avance', 'autre'];

export interface CaisseEntry {
  id: string;
  at: string;
  kind: CaisseEntryKind;
  label: string;
  method?: 'cash' | 'card';
  amount: number;
  affectsDrawer: boolean;
  staffName: string;
  note?: string;
}

export interface CashSession {
  _id: string;
  day: string;
  status: 'open' | 'closed';
  openingFloat: number;
  openedAt: string;
  countedTotal?: number;
  expectedTotal?: number;
  variance?: number;
  closedAt?: string;
  note?: string;
  closingNote?: string;
}

export interface CaisseTotals {
  openingFloat: number;
  cashSales: number;
  cashRefunds: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  cardSales: number;
  cashTips: number;
  ticketCount: number;
}

interface CaisseDay {
  day: string;
  session: CashSession | null;
  totals: CaisseTotals;
  entries: CaisseEntry[];
  canClose: boolean;
}

interface CaisseState extends CaisseDay {
  loading: boolean;
  busy: boolean;
  error: string | null;
  history: CashSession[];
}

interface CaisseActions {
  load: (date?: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  open: (openingFloat: number, note?: string) => Promise<boolean>;
  addMovement: (type: CashMovementType, amount: number, reason: CashMovementReason, note?: string) => Promise<boolean>;
  close: (countedTotal: number, note?: string) => Promise<boolean>;
  clearError: () => void;
}

const EMPTY_TOTALS: CaisseTotals = {
  openingFloat: 0,
  cashSales: 0,
  cashRefunds: 0,
  cashIn: 0,
  cashOut: 0,
  expectedCash: 0,
  cardSales: 0,
  cashTips: 0,
  ticketCount: 0,
};

function message(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : 'Erreur inattendue.';
}

export const useCaisse = create<CaisseState & CaisseActions>((set, get) => ({
  day: salonDateKey(new Date()),
  session: null,
  totals: EMPTY_TOTALS,
  entries: [],
  canClose: false,
  loading: true,
  busy: false,
  error: null,
  history: [],

  load: async (date) => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<CaisseDay>('/caisse/journal', date ? { date } : undefined);
      set({ ...data, loading: false });
    } catch (err) {
      set({ loading: false, error: message(err) });
    }
  },

  // 403 attendu pour un token PIN staff : l'historique reste manager-only côté serveur.
  // Ce n'est pas une erreur à afficher, juste une section qui ne s'ouvre pas.
  loadHistory: async () => {
    try {
      const data = await api.get<CashSession[]>('/caisse/sessions', { limit: 30 });
      set({ history: data });
    } catch {
      set({ history: [] });
    }
  },

  // Chaque mutation relit la journée depuis le serveur plutôt que de patcher l'état local :
  // le théorique dépend d'encaissements faits sur d'AUTRES postes, qu'un patch local raterait.
  open: async (openingFloat, note) => {
    set({ busy: true, error: null });
    try {
      await api.post('/caisse/session/open', { openingFloat, note });
      await get().load(get().day);
      set({ busy: false });
      return true;
    } catch (err) {
      set({ busy: false, error: message(err) });
      return false;
    }
  },

  addMovement: async (type, amount, reason, note) => {
    set({ busy: true, error: null });
    try {
      await api.post('/caisse/session/movements', { type, amount, reason, note });
      await get().load(get().day);
      set({ busy: false });
      return true;
    } catch (err) {
      set({ busy: false, error: message(err) });
      return false;
    }
  },

  close: async (countedTotal, note) => {
    set({ busy: true, error: null });
    try {
      await api.post('/caisse/session/close', { countedTotal, note });
      await get().load(get().day);
      await get().loadHistory();
      set({ busy: false });
      return true;
    } catch (err) {
      set({ busy: false, error: message(err) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
