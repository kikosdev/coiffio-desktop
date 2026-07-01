# salon-desktop

**BLACK BOX POS** — kiosk front-desk app for salon staff. Runs in a browser or Electron/Tauri window at the front desk.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| State | Zustand |
| HTTP | Axios (custom client in `src/lib/api.ts`) |
| i18n | i18next + react-i18next (FR / AR + RTL) |
| Date / time | date-fns-tz (`Africa/Tunis`) |
| Icons | Lucide React |
| Real-time | Socket.io-client |

---

## Running locally

```bash
cd salon-desktop
npm install
npm run dev          # Vite dev server on http://localhost:5174
```

### Environment variables (`.env`)

```
VITE_API_URL=https://coif-backend.onrender.com/api
```

Change to `http://localhost:3000/api` to point at a local backend.

---

## No dummy data

All data is live from the backend API. No static/mock files.  
**Exception:** The brand panel stat cards on the sign-in screen show `--` because `GET /pos/summary` is not implemented yet (`// SWAP: GET /pos/summary` comment in `BrandPanel.tsx`).

---

## App structure

```
src/
  lib/
    api.ts        Axios client — reads Bearer token, unwraps {data,message} envelope
    storage.ts    Token adapter (sessionStorage now; SWAP comment for Tauri secure store)
    time.ts       formatSalonTime() + getSalonGreeting() — Africa/Tunis timezone
  theme/
    blackbox.ts   JS color constants + staffAvatarColor(seed) helper
  i18n/
    index.ts      i18next init (FR default, AR optional, namespace: 'signin')
    locales/
      fr.json     French strings for sign-in screen
      ar.json     Arabic strings for sign-in screen
  stores/
    useSignin.ts  Zustand store for sign-in state machine
  screens/
    signin/
      index.tsx       SignInScreen — 2-column layout, i18n dir effect
      BrandPanel.tsx  Left 560px panel — live clock, greeting, stats placeholder, FR/AR toggle
      LandingView.tsx Staff grid from GET /pos/roster
      StaffCard.tsx   Avatar, online dot, PRO badge
      PinView.tsx     4-digit PIN pad, shake animation, bbpop checkmark
      ManagerView.tsx Email + password form with eye toggle
      signin.css      Keyframe animations (bbshake, bbpop) + utility classes
  views/
    TodayBoardView.tsx   Today's appointment board (live via API)
    NewSaleView.tsx      POS sale interface (live via API)
    TeamView.tsx         Team management view
    ReportsView.tsx      Sales reports
  components/            Shared UI components
  FrontDeskShell.tsx     Main app shell after sign-in (tabs: Today · Ventes · Team · Reports)
  main.tsx               BrowserRouter: /signin → SignInScreen, /pos → PosGuard → FrontDeskShell
```

---

## Sign-in flow

The app has 3 views managed by `useSignin.ts`:

```
/signin
  └─ LandingView    Staff grid (GET /pos/roster)
       └─ PinView   4-digit PIN pad → POST /auth/login-pin
  └─ ManagerView    Email + password → POST /auth/login
       └─ /pos      FrontDeskShell (guarded by PosGuard)
```

**PinView auto-submits when the 4th digit is entered** (no confirm button).

**Lockout:** 5 wrong PINs → 30 s lockout. The remaining-seconds message comes from the backend.

**Token storage:** `sessionStorage` key `bb_pos_token`. A `// SWAP: Tauri secure store` comment marks the seam for future native app migration.

---

## POS guard

`PosGuard` in `src/components/PosGuard.tsx` checks `storage.hasToken()` synchronously. If no token → redirect to `/signin`. This is a synchronous sessionStorage check; the `// SWAP` comment marks where to add an async Tauri secure store read + loading state.

Lock screen button in `FrontDeskShell.tsx` calls `storage.clearToken()` then `navigate('/signin')`.

---

## i18n / RTL

- Default language: French (`fr`)
- AR toggle available in BrandPanel footer
- Switching to AR sets `document.documentElement.dir = 'rtl'`; switching back sets `ltr`
- The effect resets to `ltr` on `SignInScreen` unmount (rest of the app is LTR only)

---

## Staff must be POS-enabled

A staff member only appears on the kiosk grid if:
1. `isActive: true`
2. `posEnabled: true`
3. `pinHash` is set

Run the seed script in `salon-backend/` to enable staff:

```bash
cd salon-backend
SEED_PIN=5678 npx ts-node src/scripts/seed-pos-pins.ts
```

`SEED_PIN=1234` is blocked by the script.

---

## Key design tokens

Accent: `#F5A623` (one shade lighter than the mobile gold — used for PIN dot active state, CTA buttons, avatar halos).  
All colors are in `src/theme/blackbox.ts`. Components use Tailwind classes or the JS constants for inline SVG fills only.

---

## Future / planned

- `// SWAP: Tauri secure store` — replace sessionStorage with `tauri-plugin-stronghold` for native token storage
- `// SWAP: GET /pos/summary` — brand panel stat cards (appointments today, revenue today, next client)
- `// TODO RegisterSession` — `POST /pos/clock-in` will eventually also open a register session record
- Multi-language expansion beyond FR/AR
