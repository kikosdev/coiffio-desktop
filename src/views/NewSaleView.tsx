import { useState } from 'react';
import { Search, X, Plus, Minus, ChevronDown, CreditCard, Scissors, Wind, Palette, Package, Layers } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────── */
type Category = 'all' | 'hair' | 'beard' | 'color' | 'product';

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  duration?: number;
  category: Category;
}

interface CartLine {
  uid: string;
  item: CatalogItem;
  qty: number;
  barberId: string;
}

/* ── Mock data ─────────────────────────────────────────────── */
const CATALOG: CatalogItem[] = [
  { id: 's1',  name: 'Classic Cut',        price: 25,  duration: 30,  category: 'hair'    },
  { id: 's2',  name: 'Fade',               price: 30,  duration: 35,  category: 'hair'    },
  { id: 's3',  name: 'Kid Cut',            price: 20,  duration: 25,  category: 'hair'    },
  { id: 's4',  name: 'Shampoo + Blow Dry', price: 20,  duration: 30,  category: 'hair'    },
  { id: 's5',  name: 'Beard Trim',         price: 15,  duration: 20,  category: 'beard'   },
  { id: 's6',  name: 'Hot Towel Shave',    price: 35,  duration: 45,  category: 'beard'   },
  { id: 's7',  name: 'Line-up',            price: 12,  duration: 15,  category: 'beard'   },
  { id: 's8',  name: 'Full Color',         price: 85,  duration: 90,  category: 'color'   },
  { id: 's9',  name: 'Highlights',         price: 120, duration: 120, category: 'color'   },
  { id: 's10', name: 'Toning',             price: 50,  duration: 60,  category: 'color'   },
  { id: 'p1',  name: 'Pomade Classic',     price: 18,                  category: 'product' },
  { id: 'p2',  name: 'Beard Oil 30ml',     price: 22,                  category: 'product' },
  { id: 'p3',  name: 'Hair Wax',           price: 15,                  category: 'product' },
  { id: 'p4',  name: 'Sea Salt Spray',     price: 19,                  category: 'product' },
];

const BARBERS = [
  { id: 'b1', name: 'Karim',   initials: 'KM', color: '#E05C5C' },
  { id: 'b2', name: 'Youssef', initials: 'YB', color: '#5BBF7A' },
  { id: 'b3', name: 'Marcus',  initials: 'MD', color: '#9B59B6' },
  { id: 'b4', name: 'Sonia',   initials: 'SB', color: '#F5A623' },
];

const TAX_RATE = 0.19;

const TABS: { id: Category; label: string; Icon: React.ElementType }[] = [
  { id: 'all',     label: 'All',          Icon: Layers   },
  { id: 'hair',    label: 'Hair',         Icon: Scissors },
  { id: 'beard',   label: 'Beard & Shave',Icon: Wind     },
  { id: 'color',   label: 'Color',        Icon: Palette  },
  { id: 'product', label: 'Products',     Icon: Package  },
];

/* ── Helpers ─────────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2);
}

/* ── Component ─────────────────────────────────────────────── */
export function NewSaleView() {
  const [tab,        setTab]        = useState<Category>('all');
  const [search,     setSearch]     = useState('');
  const [cart,       setCart]       = useState<CartLine[]>([]);
  const [mode,       setMode]       = useState<'walkin' | 'booked'>('walkin');
  const [defaultBarber, setDefaultBarber] = useState('b1');
  const [charged,    setCharged]    = useState(false);

  /* ── Catalogue filtering ─────────────────────────────────── */
  const visible = CATALOG.filter(item => {
    const matchCat = tab === 'all' || item.category === tab;
    const matchQ   = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  /* ── Cart actions ────────────────────────────────────────── */
  function addItem(item: CatalogItem) {
    setCart(prev => {
      const existing = prev.find(l => l.item.id === item.id && l.barberId === defaultBarber);
      if (existing) {
        return prev.map(l => l.uid === existing.uid ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...prev, { uid: uid(), item, qty: 1, barberId: defaultBarber }];
    });
  }

  function removeItem(lineUid: string) {
    setCart(prev => prev.filter(l => l.uid !== lineUid));
  }

  function changeQty(lineUid: string, delta: number) {
    setCart(prev =>
      prev
        .map(l => l.uid === lineUid ? { ...l, qty: l.qty + delta } : l)
        .filter(l => l.qty > 0)
    );
  }

  function changeBarber(lineUid: string, barberId: string) {
    setCart(prev => prev.map(l => l.uid === lineUid ? { ...l, barberId } : l));
  }

  function clearCart() {
    setCart([]);
    setCharged(false);
  }

  /* ── Totals ─────────────────────────────────────────────── */
  const subtotal = cart.reduce((s, l) => s + l.item.price * l.qty, 0);
  const tax      = subtotal * TAX_RATE;
  const total    = subtotal + tax;

  const fmt = (n: number) => n.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT: Catalogue ────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-line">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 shrink-0">
          <h1 className="text-base font-semibold mb-4">New Sale</h1>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search services or products…"
              className="w-full bg-surface border border-line rounded-xl pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-muted outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0',
                  tab === id
                    ? 'bg-accent/10 text-accent border border-accent/30'
                    : 'text-muted hover:text-ink hover:bg-surface border border-transparent',
                ].join(' ')}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {visible.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted text-sm">
              No results for "{search}"
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {visible.map(item => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="bg-surface rounded-card p-4 text-left hover:border-accent/40 border border-line transition-all duration-150 group active:scale-[0.98]"
                >
                  {item.duration && (
                    <span className="text-[10px] text-muted mb-1.5 block">{item.duration} min</span>
                  )}
                  <span className="block text-sm font-medium leading-snug mb-3 group-hover:text-ink">
                    {item.name}
                  </span>
                  <span className="font-mono text-sm font-semibold text-accent">
                    {item.price} TND
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Current Ticket ──────────────────────────── */}
      <div className="w-[320px] shrink-0 flex flex-col bg-surface-2 overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 shrink-0 border-b border-line">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Current Ticket</h2>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-[11px] text-muted hover:text-error transition-colors">
                Clear
              </button>
            )}
          </div>

          {/* Walk-in / Booked toggle */}
          <div className="flex bg-surface rounded-lg p-0.5 mb-4">
            {(['walkin', 'booked'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={[
                  'flex-1 py-1.5 text-xs font-medium rounded-md transition-all',
                  mode === m ? 'bg-accent text-bg' : 'text-muted hover:text-ink',
                ].join(' ')}
              >
                {m === 'walkin' ? 'Walk-in' : 'Booked'}
              </button>
            ))}
          </div>

          {/* Default barber selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted shrink-0">New items go to</span>
            <div className="relative flex-1">
              <select
                value={defaultBarber}
                onChange={e => setDefaultBarber(e.target.value)}
                className="w-full appearance-none bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent/50 cursor-pointer pr-6"
              >
                {BARBERS.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Cart lines */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted">
              <ShoppingCartIcon />
              <span className="text-xs">Tap a service to add it</span>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(line => {
                const barber = BARBERS.find(b => b.id === line.barberId)!;
                return (
                  <div key={line.uid} className="bg-surface rounded-xl p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium leading-snug flex-1 pr-2">
                        {line.item.name}
                      </span>
                      <button
                        onClick={() => removeItem(line.uid)}
                        className="text-muted hover:text-error transition-colors shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Barber badge */}
                      <div className="relative">
                        <select
                          value={line.barberId}
                          onChange={e => changeBarber(line.uid, e.target.value)}
                          className="appearance-none pl-6 pr-4 py-1 rounded-full text-[10px] font-medium text-ink outline-none cursor-pointer border border-line bg-surface-2"
                          style={{ background: `${barber.color}1A` }}
                        >
                          {BARBERS.map(b => (
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

                      {/* Qty + price */}
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
                        <span className="font-mono text-xs font-semibold text-accent w-16 text-right">
                          {fmt(line.item.price * line.qty)} TND
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Totals + Charge */}
        <div className="px-5 pt-3 pb-5 shrink-0 border-t border-line">
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-xs text-muted">
              <span>Subtotal</span>
              <span className="font-mono">{fmt(subtotal)} TND</span>
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>Tax (19%)</span>
              <span className="font-mono">{fmt(tax)} TND</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-line pt-2 mt-2">
              <span>Total</span>
              <span className="font-mono text-accent">{fmt(total)} TND</span>
            </div>
          </div>

          {charged ? (
            <div className="w-full py-3 rounded-xl bg-success/20 border border-success/40 text-success text-sm font-semibold text-center">
              ✓ Payment recorded
            </div>
          ) : (
            <button
              onClick={() => cart.length > 0 && setCharged(true)}
              className={[
                'w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
                cart.length > 0
                  ? 'bg-accent text-bg hover:bg-amber-400 active:scale-[0.98]'
                  : 'bg-surface text-muted cursor-not-allowed',
              ].join(' ')}
            >
              <CreditCard size={15} />
              Charge {cart.length > 0 ? `${fmt(total)} TND` : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ShoppingCartIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  );
}
