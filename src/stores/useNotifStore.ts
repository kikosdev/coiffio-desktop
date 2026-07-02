import { create } from 'zustand';
import { api } from '../lib/api';

export interface NotifItem {
  _id: string;
  groupId?: string;
  title: string;
  body: string;
  date: string; // ISO
}

interface NotifState {
  items: NotifItem[];
  unread: number;
  /** Loads the persisted salon-wide feed — the server is the durable store, not the client. */
  hydrate: () => Promise<void>;
  /** Real-time arrival. Server already dedupes by groupId; this is defense-in-depth. */
  push: (n: NotifItem) => void;
  markAllRead: () => void;
}

export const useNotifStore = create<NotifState>((set, get) => ({
  items: [],
  unread: 0,

  hydrate: async () => {
    try {
      const list = await api.get<NotifItem[]>('/pos/notifications');
      set({ items: list, unread: 0 }); // history isn't "new" on load
    } catch {
      // Stay empty — the bell just won't show history for this session.
    }
  },

  push: (n) => {
    const alreadySeen = n.groupId && get().items.some((x) => x.groupId === n.groupId);
    if (alreadySeen) return;
    set((s) => ({ items: [n, ...s.items].slice(0, 50), unread: s.unread + 1 }));
  },

  // Marks read, doesn't clear — the history stays visible next time the bell opens.
  markAllRead: () => {
    set({ unread: 0 });
    api.patch('/pos/notifications/read', {}).catch(() => {});
  },
}));
