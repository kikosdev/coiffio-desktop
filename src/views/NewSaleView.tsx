import { useEffect, useMemo, useState } from 'react';
import {
  Search, X, Plus, Minus, CreditCard, Scissors, Wind, Palette, Package, Layers,
  Loader2, Lock, Banknote, Check, ArrowRight, ShoppingCart, Phone, Droplet,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useCaisse } from '../stores/useCaisse';

interface DoseConfigEntry {
  productId: string;
  productName: string;
  doses: number;
}

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  durationMin?: number;
  category: string;
  doseConfig?: DoseConfigEntry[];
}

interface Barber {
  id: string;
  name: string;
  initials: string;
  color: string;
}

interface CartLine {
  uid: string;
  item: CatalogItem;
  qty: number;
  barberId: string;
}

interface PosConfig {
  taxRate: number;
  currency: string;
  lossControlAlertsEnabled: boolean;
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  hair: Scissors,
  beard: Wind,
  color: Palette,
  product: Package,
};

function uid() {
  return Math.random().toString(36).slice(2);
}

/** Suggestions de billets : le compte juste, puis les arrondis supérieurs plausibles. */
function cashSuggestions(total: number): number[] {
  const out = [total];
  for (const step of [5, 10, 20, 50]) {
    const up = Math.ceil(total / step) * step;
    if (up > total && !out.includes(up)) out.push(up);
  }
  return out.slice(0, 5);
}

export function NewSaleView({ onOpenCaisse }: { onOpenCaisse: () => void }) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [config, setConfig] = useState<PosConfig>({ taxRate: 0, currency: 'TND', lossControlAlertsEnabled: false });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [clientPhone, setClientPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [activeBarber, setActiveBarber] = useState('');
  const [method, setMethod] = useState<'cash' | 'card'>('cash');
  const [charging, setCharging] = useState(false);
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [charged, setCharged] = useState(false);
  const [cashModal, setCashModal] = useState(false);
  // LC-3 (Prompt 3-bis) : dosesDeclared par produit — pré-rempli au théorique, modifiable.
  const [doseDeclarations, setDoseDeclarations] = useState<Record<string, number>>({});

  const caisseSession = useCaisse((s) => s.session);
  const caisseLoading = useCaisse((s) => s.loading);
  const caisseOpen = caisseSession?.status === 'open';

  useEffect(() => {
    useCaisse.getState().load();
  }, []);

  useEffect(() => {
    setLoadError(null);
    Promise.all([
      api.get<CatalogItem[]>('/pos/catalog'),
      // `/pos/team` (staff actifs) et NON `/pos/roster` (qui filtre `posEnabled:true`, càd
      // les seuls comptes autorisés à ouvrir le POS par PIN). Un barbier sans code PIN
      // exécute quand même des prestations et doit pouvoir se voir attribuer une vente.
      api.get<{ id: string; first: string; initial: string; color: string }[]>('/pos/team'),
      api.get<PosConfig>('/pos/config'),
    ])
      .then(([cat, team, cfg]) => {
        setCatalog(cat);
        setBarbers(team.map((r) => ({ id: r.id, name: r.first, initials: r.initial, color: r.color })));
        setConfig(cfg);
      })
      .catch(() => setLoadError('Chargement impossible. Vérifiez la connexion au serveur.'))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['all', ...new Set(catalog.map((i) => i.category).filter(Boolean))];

  const visible = catalog.filter((item) => {
    const matchCat = activeCategory === 'all' || item.category === activeCategory;
    const matchQ = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  /** Quantité déjà au ticket pour ce service, tous barbiers confondus — pilote le badge
   *  de sélection multiple sur la carte du catalogue. */
  const qtyInCart = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of cart) map.set(l.item.id, (map.get(l.item.id) ?? 0) + l.qty);
    return map;
  }, [cart]);

  /**
   * LC-3 (Prompt 3-bis) : théorique attendu agrégé sur TOUT le ticket, produit par produit —
   * `qty` de la ligne ignoré, comme côté serveur (`createWalkinSale`'s `serviceIds` ne
   * multiplie pas non plus par `qty`). Simplification connue : si le MÊME produit est
   * attendu par les services de DEUX barbiers différents dans un même ticket, l'UI ne montre
   * qu'une seule saisie fusionnée (l'appel serveur reste correct côté charge(), qui refiltre
   * par groupe — seul l'affichage ne distingue pas visuellement "quel barbier").
   */
  const expectedDoses = useMemo(() => {
    const map = new Map<string, { productName: string; doses: number }>();
    for (const line of cart) {
      for (const dc of line.item.doseConfig ?? []) {
        const existing = map.get(dc.productId);
        if (existing) existing.doses += dc.doses;
        else map.set(dc.productId, { productName: dc.productName, doses: dc.doses });
      }
    }
    return map;
  }, [cart]);

  useEffect(() => {
    setDoseDeclarations((prev) => {
      const next: Record<string, number> = {};
      for (const [productId, info] of expectedDoses) {
        next[productId] = prev[productId] ?? info.doses;
      }
      return next;
    });
  }, [expectedDoses]);

  function addItem(item: CatalogItem) {
    if (!activeBarber) return;
    setCharged(false);
    setChargeError(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.item.id === item.id && l.barberId === activeBarber);
      if (existing) return prev.map((l) => (l.uid === existing.uid ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { uid: uid(), item, qty: 1, barberId: activeBarber }];
    });
  }

  function removeItem(lineUid: string) {
    setCart((prev) => prev.filter((l) => l.uid !== lineUid));
  }

  function changeQty(lineUid: string, delta: number) {
    setCart((prev) => prev.map((l) => (l.uid === lineUid ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0));
  }

  function changeBarber(lineUid: string, barberId: string) {
    setCart((prev) => prev.map((l) => (l.uid === lineUid ? { ...l, barberId } : l)));
  }

  function clearCart() {
    setCart([]);
    setCharged(false);
    setChargeError(null);
    setClientPhone('');
    setClientName('');
    setDoseDeclarations({});
  }

  async function charge(received?: number) {
    if (cart.length === 0 || charging) return;
    const phone = clientPhone.trim();
    if (!phone) {
      setChargeError('Le téléphone du client est requis — chaque service rendu ouvre une fiche RDV.');
      return;
    }
    setCharging(true);
    setChargeError(null);
    try {
      // Une vente par barbier : `Payment.stylistId` (et `Appointment.stylistId`) est un
      // scalaire (commission attribuée à UN staff), donc un ticket mixte produit un
      // encaissement — et un RDV walk-in distinct (LC-0) — par barbier concerné. Même client,
      // même téléphone : `resolveClient()` merge-on-phone, donc tous les RDV créés pointent
      // vers le même `clientId` côté serveur.
      const byBarber = new Map<string, CartLine[]>();
      for (const line of cart) {
        byBarber.set(line.barberId, [...(byBarber.get(line.barberId) ?? []), line]);
      }
      // `received` n'est transmis QUE si le ticket ne produit qu'un seul encaissement : le
      // serveur calcule le rendu comme `reçu − montant DE CE paiement`, donc l'envoyer sur un
      // ticket éclaté entre deux barbiers archiverait un rendu faux. L'opérateur voit quand
      // même la monnaie à rendre dans la modale, elle n'est simplement pas historisée.
      const single = byBarber.size === 1;
      for (const [barberId, lines] of byBarber) {
        // LC-3 (Prompt 3-bis) : les doses de CE groupe uniquement — un produit attendu par un
        // AUTRE barbier du même ticket ne doit pas se glisser dans cet appel (le serveur
        // refuserait la ligne en 400, "produit non attendu pour ce rendez-vous").
        const groupProductIds = new Set(lines.flatMap((l) => (l.item.doseConfig ?? []).map((dc) => dc.productId)));
        const doses = config.lossControlAlertsEnabled
          ? [...groupProductIds]
              .filter((pid) => doseDeclarations[pid] !== undefined)
              .map((productId) => ({ productId, dosesDeclared: doseDeclarations[productId] }))
          : [];

        await api.post('/pos/sale-with-appointment', {
          stylistId: barberId,
          method,
          clientPhone: phone,
          ...(clientName.trim() ? { clientName: clientName.trim() } : {}),
          ...(single && received !== undefined ? { received } : {}),
          items: lines.map((l) => ({
            kind: 'service' as const,
            refId: l.item.id,
            name: l.item.name,
            qty: l.qty,
            unitPrice: l.item.price,
          })),
          ...(doses.length > 0 ? { doses } : {}),
        });
      }
      setCart([]);
      setClientPhone('');
      setClientName('');
      setDoseDeclarations({});
      setCharged(true);
      setCashModal(false);
      // Le tiroir vient de bouger — le journal de la Caisse doit repartir du serveur.
      void useCaisse.getState().load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "L'encaissement a échoué.";
      setChargeError(msg);
      // Caisse fermée entre-temps (autre poste, clôture) : resynchronise pour afficher l'écran de garde.
      if (err instanceof ApiError && err.statusCode === 409) void useCaisse.getState().load();
    } finally {
      setCharging(false);
    }
  }

  const subtotal = cart.reduce((s, l) => s + l.item.price * l.qty, 0);
  const tax = subtotal * (config.taxRate / 100);
  const total = subtotal + tax;
  const fmt = (n: number) => n.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const money = (n: number) => `${fmt(n)} ${config.currency}`;

  const selectedBarber = barbers.find((b) => b.id === activeBarber) ?? null;

  // ── Garde caisse : aucune vente hors journée de caisse ouverte ──────────────
  if (!caisseLoading && !caisseOpen) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-error/10 border border-error/30 flex items-center justify-center">
          <Lock size={22} className="text-error" strokeWidth={1.8} />
        </div>
        <div>
          <h2 className="text-base font-semibold mb-1.5">
            {caisseSession?.status === 'closed' ? 'Caisse clôturée' : 'Caisse fermée'}
          </h2>
          <p className="text-xs text-muted max-w-sm leading-relaxed">
            {caisseSession?.status === 'closed'
              ? "La journée de caisse est clôturée : plus aucun encaissement n'est possible aujourd'hui."
              : "Aucune vente ne peut être encaissée tant que la journée de caisse n'est pas ouverte."}
          </p>
        </div>
        <button
          onClick={onOpenCaisse}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg text-sm font-bold hover:bg-amber-400 active:scale-[0.98] transition-all"
        >
          Aller à la caisse <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ══ TRANCHE 1 — Barbier ═══════════════════════════════════════════ */}
      <div className="w-[232px] shrink-0 flex flex-col border-r border-line overflow-hidden">
        <SliceHeader step={1} title="Barbier" active hint={selectedBarber?.name} />

        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
          {loading ? (
            [1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-surface rounded-xl animate-pulse" />)
          ) : barbers.length === 0 ? (
            <div className="text-xs text-error bg-error/10 border border-error/30 rounded-lg px-3 py-2 leading-relaxed">
              Aucun membre d'équipe actif. Ajoutez un barbier dans Team avant d'encaisser.
            </div>
          ) : (
            barbers.map((b) => {
              const active = b.id === activeBarber;
              const lines = cart.filter((l) => l.barberId === b.id).reduce((s, l) => s + l.qty, 0);
              return (
                <button
                  key={b.id}
                  onClick={() => setActiveBarber(b.id)}
                  className={[
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border text-left',
                    active
                      ? 'bg-accent/10 text-accent border-accent/40'
                      : 'text-muted hover:text-ink hover:bg-surface border-line',
                  ].join(' ')}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: b.color }}
                  >
                    {b.initials[0]}
                  </span>
                  <span className="flex-1 truncate">{b.name}</span>
                  {lines > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-bg text-[10px] font-bold flex items-center justify-center">
                      {lines}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ══ TRANCHE 2 — Services (verrouillée tant qu'aucun barbier) ══════ */}
      <div className="flex-1 flex flex-col border-r border-line overflow-hidden relative">
        <SliceHeader
          step={2}
          title="Services"
          active={!!activeBarber}
          hint={activeBarber ? (cart.length > 0 ? `${cart.length} ligne${cart.length > 1 ? 's' : ''}` : 'Sélection multiple') : undefined}
        />

        <div className="px-5 pb-3 shrink-0 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!activeBarber}
              placeholder="Rechercher un service ou produit…"
              className="w-full bg-surface border border-line rounded-xl pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-muted outline-none focus:border-accent/50 transition-colors disabled:opacity-50"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const Icon = cat === 'all' ? Layers : CATEGORY_ICON[cat] ?? Layers;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  disabled={!activeBarber}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 disabled:opacity-50',
                    activeCategory === cat
                      ? 'bg-accent/10 text-accent border border-accent/30'
                      : 'text-muted hover:text-ink hover:bg-surface border border-transparent',
                  ].join(' ')}
                >
                  <Icon size={12} />
                  {cat === 'all' ? 'Tous' : cat}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="bg-surface rounded-card p-4 h-24 animate-pulse" />)}
            </div>
          ) : loadError ? (
            <div className="flex items-center justify-center h-40 text-error text-sm">{loadError}</div>
          ) : visible.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted text-sm">
              {search ? `Aucun résultat pour « ${search} »` : 'Aucun service au catalogue.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {visible.map((item) => {
                const qty = qtyInCart.get(item.id) ?? 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    disabled={!activeBarber}
                    className={[
                      'relative bg-surface rounded-card p-4 text-left border transition-all duration-150 group active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
                      qty > 0 ? 'border-accent/50' : 'border-line hover:border-accent/40',
                    ].join(' ')}
                  >
                    {qty > 0 && (
                      <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-bg text-[10px] font-bold flex items-center justify-center">
                        ×{qty}
                      </span>
                    )}
                    {item.durationMin && <span className="text-[10px] text-muted mb-1.5 block">{item.durationMin} min</span>}
                    <span className="block text-sm font-medium leading-snug mb-3 pr-6">{item.name}</span>
                    <span className="font-mono text-sm font-semibold text-accent">{money(item.price)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!activeBarber && !loading && (
          <SliceLock label="Choisissez d'abord un barbier" />
        )}
      </div>

      {/* ══ TRANCHE 3 — Ticket (verrouillée tant qu'aucun service) ════════ */}
      <div className="w-[336px] shrink-0 flex flex-col bg-surface-2 overflow-hidden relative">
        <SliceHeader step={3} title="Ticket" active={cart.length > 0}>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-[11px] text-muted hover:text-error transition-colors">
              Vider
            </button>
          )}
        </SliceHeader>

        <div className="px-5 pb-4 shrink-0 space-y-1.5">
          {/* Le service rendu ouvre toujours une fiche RDV (LC-0) — le téléphone est la clé
              d'identité client (merge-on-phone), donc requis avant tout encaissement. Le nom
              reste optionnel : défaut "Client" côté serveur si laissé vide. */}
          <div className="relative">
            <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Téléphone client (requis)"
              className="w-full bg-surface border border-line rounded-lg pl-8 pr-3 py-2 text-xs text-ink placeholder:text-muted outline-none focus:border-accent/50 transition-colors"
            />
          </div>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nom client (optionnel)"
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink placeholder:text-muted outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-1">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted">
              <ShoppingCart size={30} strokeWidth={1.5} />
              <span className="text-xs text-center px-4">
                {activeBarber ? 'Ajoutez un ou plusieurs services' : 'Choisissez un barbier puis un service'}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((line) => {
                const barber = barbers.find((b) => b.id === line.barberId) ?? barbers[0];
                if (!barber) return null;
                return (
                  <div key={line.uid} className="bg-surface rounded-xl p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium leading-snug flex-1 pr-2">{line.item.name}</span>
                      <button onClick={() => removeItem(line.uid)} className="text-muted hover:text-error transition-colors shrink-0">
                        <X size={12} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="relative">
                        <select
                          value={line.barberId}
                          onChange={(e) => changeBarber(line.uid, e.target.value)}
                          className="appearance-none pl-6 pr-4 py-1 rounded-full text-[10px] font-medium text-ink outline-none cursor-pointer border border-line bg-surface-2"
                          style={{ background: `${barber.color}1A` }}
                        >
                          {barbers.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                        <span
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white pointer-events-none"
                          style={{ backgroundColor: barber.color }}
                        >
                          {barber.initials[0]}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => changeQty(line.uid, -1)}
                            className="w-5 h-5 rounded-md bg-surface-2 border border-line flex items-center justify-center hover:border-accent/40 transition-colors"
                          >
                            <Minus size={8} />
                          </button>
                          <span className="font-mono text-xs w-4 text-center">{line.qty}</span>
                          <button
                            onClick={() => changeQty(line.uid, 1)}
                            className="w-5 h-5 rounded-md bg-surface-2 border border-line flex items-center justify-center hover:border-accent/40 transition-colors"
                          >
                            <Plus size={8} />
                          </button>
                        </div>
                        <span className="font-mono text-xs font-semibold text-accent w-20 text-right">
                          {money(line.item.price * line.qty)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* LC-3 (Prompt 3-bis) : saisie inline, uniquement si le salon a opté dans le module
            (A4) ET qu'au moins un service du panier a un doseConfig — zéro friction sinon. */}
        {config.lossControlAlertsEnabled && expectedDoses.size > 0 && (
          <div className="px-5 py-3 shrink-0 border-t border-line space-y-2">
            <div className="text-[11px] font-medium text-muted flex items-center gap-1.5">
              <Droplet size={11} /> Doses utilisées
            </div>
            {[...expectedDoses].map(([productId, info]) => (
              <div key={productId} className="flex items-center justify-between gap-2">
                <span className="text-xs flex-1 truncate" title={info.productName}>{info.productName}</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={doseDeclarations[productId] ?? info.doses}
                  onChange={(e) =>
                    setDoseDeclarations((prev) => ({ ...prev, [productId]: Number(e.target.value) }))
                  }
                  className="w-16 bg-surface border border-line rounded-lg px-2 py-1 text-xs font-mono text-ink text-right outline-none focus:border-accent/50 transition-colors"
                />
              </div>
            ))}
          </div>
        )}

        <div className="px-5 pt-3 pb-5 shrink-0 border-t border-line">
          {/* Le verrou de la tranche 3 vit DANS le pied, pas en surimpression : posé en
              overlay il recouvrait le sélecteur de paiement et le bouton d'encaissement. */}
          {cart.length === 0 && (
            <div className="flex justify-center mb-3">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-line text-[11px] text-muted">
                <Lock size={10} /> Ajoutez un service au ticket
              </span>
            </div>
          )}

          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-xs text-muted">
              <span>Sous-total</span>
              <span className="font-mono">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>TVA ({config.taxRate}%)</span>
              <span className="font-mono">{money(tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-line pt-2 mt-2">
              <span>Total</span>
              <span className="font-mono text-accent">{money(total)}</span>
            </div>
          </div>

          {/* Moyen de paiement au plus près du geste d'encaissement — c'est la dernière
              décision prise avant d'appuyer, pas un réglage d'en-tête. */}
          <div className="flex bg-surface rounded-lg p-0.5 mb-3">
            {(['cash', 'card'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={[
                  'flex-1 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5',
                  method === m ? 'bg-accent text-bg' : 'text-muted hover:text-ink',
                ].join(' ')}
              >
                {m === 'cash' ? <Banknote size={12} /> : <CreditCard size={12} />}
                {m === 'cash' ? 'Espèces' : 'Carte'}
              </button>
            ))}
          </div>

          {chargeError && (
            <div className="mb-3 text-[11px] text-error bg-error/10 border border-error/30 rounded-lg px-3 py-2">{chargeError}</div>
          )}

          {charged ? (
            <div className="w-full py-3 rounded-xl bg-success/20 border border-success/40 text-success text-sm font-semibold text-center flex items-center justify-center gap-2">
              <Check size={15} /> Encaissement enregistré
            </div>
          ) : (
            <button
              onClick={() => (method === 'cash' ? setCashModal(true) : charge())}
              disabled={cart.length === 0 || charging || !clientPhone.trim()}
              className={[
                'w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
                cart.length > 0 && !charging && clientPhone.trim()
                  ? 'bg-accent text-bg hover:bg-amber-400 active:scale-[0.98]'
                  : 'bg-surface text-muted cursor-not-allowed',
              ].join(' ')}
            >
              {charging ? <Loader2 size={15} className="animate-spin" /> : method === 'cash' ? <Banknote size={15} /> : <CreditCard size={15} />}
              {charging ? 'Encaissement…' : `Encaisser ${cart.length > 0 ? money(total) : ''}`}
            </button>
          )}
        </div>

      </div>

      {cashModal && (
        <CashModal
          total={total}
          currency={config.currency}
          busy={charging}
          error={chargeError}
          onConfirm={(received) => charge(received)}
          onClose={() => setCashModal(false)}
        />
      )}
    </div>
  );
}

// ─── Chrome des tranches ────────────────────────────────────────────────────

function SliceHeader({ step, title, active, hint, children }: {
  step: number; title: string; active: boolean; hint?: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-5 pt-5 pb-4 shrink-0">
      <span className={[
        'w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0',
        active ? 'bg-accent text-bg' : 'bg-surface text-muted border border-line',
      ].join(' ')}>
        {step}
      </span>
      <h2 className={`text-sm font-semibold ${active ? '' : 'text-muted'}`}>{title}</h2>
      {hint && <span className="text-[11px] text-muted truncate">— {hint}</span>}
      <div className="flex-1" />
      {children}
    </div>
  );
}

/** Voile de verrouillage : la tranche reste lisible (l'opérateur voit ce qui l'attend)
 *  mais rien n'y est cliquable tant que l'étape précédente n'est pas faite. */
function SliceLock({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none bg-bg/40">
      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-line text-[11px] text-muted">
        <Lock size={10} /> {label}
      </span>
    </div>
  );
}

// ─── Modale espèces (rendu de monnaie) ──────────────────────────────────────

function CashModal({ total, currency, busy, error, onConfirm, onClose }: {
  total: number;
  currency: string;
  busy: boolean;
  error: string | null;
  onConfirm: (received: number) => void;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState('');
  const received = Number(raw);
  const valid = raw !== '' && Number.isFinite(received) && received >= total;
  const change = valid ? received - total : 0;
  const fmt = (n: number) => n.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const suggestions = useMemo(() => cashSuggestions(total), [total]);

  function submit() {
    if (!valid || busy) return;
    onConfirm(received);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={busy ? undefined : onClose} />
      <div className="relative w-[400px] bg-surface-2 border border-line rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Banknote size={15} className="text-accent" /> Paiement espèces
          </h3>
          <button onClick={onClose} disabled={busy} className="text-muted hover:text-ink transition-colors disabled:opacity-40">
            <X size={14} />
          </button>
        </div>

        <div className="flex justify-between items-baseline mb-5 pb-4 border-b border-line">
          <span className="text-xs text-muted">Total à payer</span>
          <span className="font-mono text-xl font-bold text-accent">{fmt(total)} <span className="text-xs font-normal text-muted">{currency}</span></span>
        </div>

        <label className="text-[11px] font-semibold text-muted block mb-1.5">Reçu du client</label>
        <input
          autoFocus
          type="number"
          min="0"
          step="0.001"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="0.000"
          className="w-full bg-surface border border-line rounded-xl px-3 py-3 text-lg font-mono text-ink placeholder:text-muted outline-none focus:border-accent/50 transition-colors mb-3"
        />

        <div className="flex flex-wrap gap-1.5 mb-5">
          {suggestions.map((s, i) => (
            <button
              key={s}
              onClick={() => setRaw(String(s))}
              className="px-3 py-1.5 rounded-lg bg-surface border border-line text-xs font-mono font-medium text-muted hover:text-ink hover:border-accent/40 transition-colors"
            >
              {i === 0 ? 'Compte juste' : fmt(s)}
            </button>
          ))}
        </div>

        <div className={[
          'flex justify-between items-baseline rounded-xl px-4 py-3.5 mb-5 border',
          valid && change > 0 ? 'bg-accent/10 border-accent/40' : 'bg-surface border-line',
        ].join(' ')}>
          <span className="text-xs font-semibold">À rendre au client</span>
          <span className={`font-mono text-xl font-bold ${valid && change > 0 ? 'text-accent' : 'text-muted'}`}>
            {fmt(change)} <span className="text-xs font-normal text-muted">{currency}</span>
          </span>
        </div>

        {raw !== '' && !valid && (
          <p className="text-[11px] text-error mb-4">Le montant reçu doit couvrir le total.</p>
        )}
        {error && (
          <div className="mb-4 text-[11px] text-error bg-error/10 border border-error/30 rounded-lg px-3 py-2">{error}</div>
        )}

        <button
          onClick={submit}
          disabled={!valid || busy}
          className={[
            'w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
            valid && !busy ? 'bg-accent text-bg hover:bg-amber-400 active:scale-[0.98]' : 'bg-surface text-muted cursor-not-allowed',
          ].join(' ')}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {busy ? 'Encaissement…' : 'Valider l\'encaissement'}
        </button>
      </div>
    </div>
  );
}
