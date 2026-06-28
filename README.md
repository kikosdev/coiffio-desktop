# SalonOS — Desktop « BLACK BOX Front Desk » (Borne de caisse)

> **Cible :** nouvelle app `salon-desktop/` (Tauri 2), surface **front-desk à 4 vues**.
> **Réutilise :** `salon-frontend/` (ui-kit, design tokens, features/finance, socket-events).
> **Hérite de :** `SKILL.md`, `SKILL_finance_pos.md`, `new_design.md`.
> **Décisions :** #8 (refund owner-only), #9 (scope paie stylist), tokens-only, TND/millimes.
> **Réf design :** Claude Design — « Black Box POS - Front Desk (standalone) » (4 captures validées).

---

## 🎯 Scope réel : 4 vues, pas une

La borne n'est pas qu'un POS. C'est un poste d'accueil complet avec son propre nav rail latéral
(logo BB en haut, avatar opérateur en bas) et 4 surfaces :

| Vue | Rôle | Contenu |
|---|---|---|
| **New sale** (POS) | encaisser | Grid services/produits avec onglets (All·Hair·Beard·Color·Products), recherche, **panier "Current Ticket"** avec toggle Walk-in/Booked, **assignation barber par ligne**, « New items go to », subtotal/tax/total, bouton **Charge** |
| **Today** (board) | piloter le flux | Kanban **Waiting / In chair / Done**, cartes client+service+barber, actions **Start→ / Check out→**, badges (Waited 8min, Booked, Walk-in, Paid $X), header **Add walk-in + Open register** |
| **Team** | qui est libre/occupé | Cartes barbers : statut **On shift / On break**, « Now · <client en cours / Available / Back at 1:30> », stats **Cuts today · Revenue · Rating** |
| **Reports** | clôture du jour | 4 KPI (Revenue·Bookings·Avg ticket·Tips), **Revenue by barber** (barres), **Top services**, **Payment mix** (Card/Cash/Apple Pay) |

> Le **Check out→** du board route vers **New sale** pré-rempli → boucle d'encaissement.

---

## 🎨 Thème BLACK BOX (charcoal + amber)

Le design est **dark premium** avec accent **amber/saffron saturé** (≈ `#F5A623`), plus vif que le
champagne `#D4B481` de `new_design.md`.

**Décision tokens (à valider) :** ajouter un accent dédié au surface front-desk plutôt que de
réutiliser le champagne tel quel :
```
--bg:               #0E0E0F   /* near-black */
--surface:          #1A1A1C   /* cartes */
--surface-2:        #141416
--ink:              #FFFFFF
--muted:            #8A8A8E
--accent:           #F5A623   /* amber — CTA, barres, sélection active */
--accent-soft:      rgba(245,166,35,0.14)
--success:          #5BBF7A   /* On shift, Paid */
--pending:          #F5A623   /* On break, waiting */
```
- Chiffres / montants : **JetBrains Mono**.
- Zéro hex hardcodé dans les composants — tokens uniquement.
- Avatars barbers = pastilles colorées + initiale (couleur stable par barber).

---

## 🏗️ Architecture

```
salon-desktop/                       Tauri 2 (Rust shell + WebView)
├── src/
│   ├── main.tsx                     entry borne
│   ├── FrontDeskShell.tsx           nav rail + routing 4 vues + statut sync + lock
│   ├── views/
│   │   ├── NewSaleView.tsx          réutilise features/finance + assignation barber/ligne
│   │   ├── TodayBoardView.tsx       kanban waiting/in_chair/done
│   │   ├── TeamView.tsx             statut live barbers
│   │   └── ReportsView.tsx          clôture jour (réutilise /reports)
│   └── (imports depuis salon-frontend via workspace)
├── src-tauri/
│   └── src/{main.rs, printer.rs, cash_drawer.rs, scanner.rs, updater.rs}
└── package.json
```

**Monorepo workspace** : `salon-desktop` + `salon-frontend` partagent ui-kit, tokens,
`features/finance/`, `socket-events.ts`. Pas de duplication de logique.

---

## 🔌 Intégration backend

| Vue / action | Endpoint | Note |
|---|---|---|
| New sale → encaisser | `POST /payments` (génère `Sale` source:'pos') | items service+produit, **stylistId par ligne** |
| New sale → catalogue | `GET /services`, `GET /products` | onglets = `category` |
| Today board → liste | `GET /booking?date=today` | filtré par `serviceState` |
| Today board → Start / Check out | `PATCH /booking/:id/state` | **transitions waiting→in_chair→done** |
| Team → statut live | `GET /team/live` + socket | « Now » dérivé du booking in_chair |
| Reports | `GET /reports?period=day`, `/reports/export.csv` | KPI + ventilations |
| Refund | `POST /payments/:id/refund` | **owner-only** (#8) |

### ⚠️ Extension backend requise (Today board)
Les statuts V1 (`booked/completed/cancelled`) **ne couvrent pas** Waiting/In-chair/Done.
**À ajouter** : `Booking.serviceState: 'waiting'|'in_chair'|'done'` + endpoint
`PATCH /booking/:id/state` + émission socket pour le live board. Sans ça le board est cosmétique.

---

## 🔐 Sécurité borne

- **Lock screen PIN par stylist** → résout `req.user` → `GET /caisse/me` strictement scopé (#9).
- **Per-line barber assignment** : chaque ligne du ticket porte son `stylistId` (commission correcte).
- **Refund invisible** sauf owner (garde UI + garde API, #8).
- Tauri allowlist minimale : `http` limité au backend, `fs` limité à la queue offline, pas de
  `shell.open` arbitraire. Auto-update **signé**.

---

## 💾 Offline-resilient

- POST /payments hors-ligne → **queue locale** (SQLite tauri-plugin-sql) → rejeu à la reconnexion.
- Rejeu **transactionnel** ; rejet `stock insuffisant` (FIN-11) → **flag revue manager**, jamais
  d'auto-correction silencieuse.
- Today board en lecture : cache last-known + bannière « hors-ligne ».

---

## ✅ Definition of Done

- [ ] Tauri kiosk plein écran + autostart + single-instance
- [ ] Nav rail + 4 vues fidèles aux captures
- [ ] Thème charcoal+amber pixel-match (tokens, zéro hex)
- [ ] New sale : grid+onglets, panier, **assignation barber par ligne**, Walk-in/Booked, Charge
- [ ] Today board : kanban Waiting/In-chair/Done + Start/Check-out → **nécessite `serviceState` backend**
- [ ] Team : statut live On-shift/On-break + « Now » + stats
- [ ] Reports : 4 KPI + revenue/barber + top services + payment mix + export CSV
- [ ] Lock PIN stylist → scope #9 · refund owner-only #8
- [ ] Imprimante ESC/POS + tiroir + scanner code-barres
- [ ] Offline queue + rejeu avec gestion conflit stock
- [ ] Auto-update signé + build `.msi` Windows

---

## ⚠️ Risques / arbitrages

| Risque | Mitigation |
|---|---|
| **Today board cosmétique** si pas de `serviceState` backend | Prioriser l'extension `PATCH /booking/:id/state` |
| **Theme amber non documenté** dérive vs charte | Officialiser `--accent` front-desk dans les tokens |
| **Overselling** au rejeu offline | Rejeu transactionnel + flag revue |
| **Diversité imprimantes ESC/POS** | Cibler Epson TM-T20 d'abord, abstraire ensuite |
| **2 builds front à maintenir** | Monorepo workspace, front partagé |
