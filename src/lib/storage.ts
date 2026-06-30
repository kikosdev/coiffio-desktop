/**
 * Token storage adapter — sessionStorage stand-in.
 * SWAP: Replace sessionStorage calls with Tauri secure store once Tauri is added.
 *       e.g. tauri-plugin-stronghold or invoke('plugin:stronghold|set_secret', { key, value })
 *       See: https://tauri.app/plugin/stronghold/
 *
 * sessionStorage clears on tab/window close — appropriate for a kiosk that
 * should force re-auth if the app is restarted.
 */

const POS_TOKEN_KEY = 'bb_pos_token';

export const storage = {
  getToken(): string | null {
    // SWAP: Tauri secure store read (async)
    return sessionStorage.getItem(POS_TOKEN_KEY);
  },

  setToken(token: string): void {
    // SWAP: Tauri secure store write (async)
    sessionStorage.setItem(POS_TOKEN_KEY, token);
  },

  clearToken(): void {
    // SWAP: Tauri secure store delete (async)
    sessionStorage.removeItem(POS_TOKEN_KEY);
  },

  hasToken(): boolean {
    return !!sessionStorage.getItem(POS_TOKEN_KEY);
  },
};
