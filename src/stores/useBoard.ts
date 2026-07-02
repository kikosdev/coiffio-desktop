import { create } from 'zustand';
import { salonDateKey } from '../lib/time';

interface BoardState {
  date: string;          // yyyy-MM-dd, Africa/Tunis — defaults to today
  refreshToken: number;  // bumped to signal "refetch" across components (realtime notif)
  setDate: (date: string) => void;
  goToday: () => void;
  refresh: () => void;
}

export const useBoard = create<BoardState>((set) => ({
  date: salonDateKey(new Date()),
  refreshToken: 0,

  setDate: (date) => set({ date }),
  goToday: () => set({ date: salonDateKey(new Date()) }),
  refresh: () => set((s) => ({ refreshToken: s.refreshToken + 1 })),
}));
