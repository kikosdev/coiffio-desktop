import { create } from 'zustand';
import { api, ApiError } from '../lib/api';
import { storage } from '../lib/storage';

export type SigninView = 'landing' | 'pin' | 'manager';

export interface RosterCard {
  id: string;
  first: string;
  initial: string;
  color: string;
  role: string;
  pro: boolean;
  onShift: boolean;
  statusLabel: string;
}

interface SigninState {
  view: SigninView;
  roster: RosterCard[];
  rosterLoading: boolean;
  selStaffId: string | null;
  pin: string;
  error: boolean;
  unlocked: boolean;
  attempts: number;
  lockMsg: string | null;
  managerError: string | null;
}

interface SigninActions {
  loadRoster: () => Promise<void>;
  pickStaff: (id: string) => void;
  back: () => void;
  goManager: () => void;
  pressKey: (key: string) => void;
  submitPin: (navigate: (path: string) => void) => Promise<void>;
  managerLogin: (
    email: string,
    password: string,
    navigate: (path: string) => void,
  ) => Promise<void>;
  resetError: () => void;
}

export const useSignin = create<SigninState & SigninActions>((set, get) => ({
  view: 'landing',
  roster: [],
  rosterLoading: false,
  selStaffId: null,
  pin: '',
  error: false,
  unlocked: false,
  attempts: 0,
  lockMsg: null,
  managerError: null,

  loadRoster: async () => {
    set({ rosterLoading: true });
    try {
      // SWAP: GET /pos/roster
      const cards = await api.get<RosterCard[]>('/pos/roster');
      set({ roster: cards, rosterLoading: false });
    } catch {
      // Empty grid on error — manager login still available
      set({ roster: [], rosterLoading: false });
    }
  },

  pickStaff: (id: string) => {
    set({ selStaffId: id, view: 'pin', pin: '', error: false, unlocked: false, lockMsg: null });
  },

  back: () => {
    set({ view: 'landing', selStaffId: null, pin: '', error: false, unlocked: false, lockMsg: null });
  },

  goManager: () => {
    set({ view: 'manager', pin: '', error: false, managerError: null });
  },

  pressKey: (key: string) => {
    const { pin, unlocked } = get();
    if (unlocked) return;
    if (key === '⌫') {
      set({ pin: pin.slice(0, -1), error: false });
      return;
    }
    if (pin.length >= 4) return;
    set({ pin: pin + key, error: false });
    // PinView watches pin.length === 4 via useEffect and calls submitPin(navigate)
  },

  submitPin: async (navigate: (path: string) => void) => {
    const { selStaffId, pin } = get();
    if (!selStaffId || pin.length !== 4) return;

    try {
      // SWAP: POST /auth/login-pin
      const result = await api.post<{ token: string; staff: { id: string; name: string } }>(
        '/auth/login-pin',
        { staffId: selStaffId, pin },
      );
      storage.setToken(result.token);
      set({ unlocked: true, pin: '' }); // pin cleared immediately — never kept in state
      setTimeout(async () => {
        try {
          // SWAP: POST /pos/clock-in
          await api.post('/pos/clock-in');
        } catch {
          // Non-blocking — kiosk proceeds even if clock-in fails
          // TODO RegisterSession: handle clock-in failure once RegisterSession exists
        }
        navigate('/pos');
      }, 750);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error';
      const lockedMatch = msg.match(/Try again in (\d+)s/i);
      set({
        pin: '',
        error: true,
        lockMsg: lockedMatch ? msg : null,
        attempts: get().attempts + 1,
      });
      setTimeout(() => set({ error: false }), 520);
    }
  },

  managerLogin: async (
    email: string,
    password: string,
    navigate: (path: string) => void,
  ) => {
    set({ managerError: null });
    try {
      // SWAP: POST /auth/login (existing full-JWT endpoint)
      const result = await api.post<{ token: string; user: unknown }>(
        '/auth/login',
        { identifier: email, password },
      );
      storage.setToken(result.token);
      try {
        // SWAP: POST /pos/clock-in
        await api.post('/pos/clock-in');
      } catch {
        // Non-blocking — TODO RegisterSession
      }
      setTimeout(() => navigate('/pos'), 750);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Sign in failed.';
      set({ managerError: msg });
    }
  },

  resetError: () => set({ error: false, lockMsg: null }),
}));
