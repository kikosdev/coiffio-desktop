import { TrendingUp, TrendingDown, Download } from 'lucide-react';

/* ── Mock data ─────────────────────────────────────────────── */
const KPI = [
  { label: 'Revenue',    value: '1 840',   unit: 'TND', change: '+12%', up: true  },
  { label: 'Bookings',   value: '24',       unit: '',    change: '+3',   up: true  },
  { label: 'Avg Ticket', value: '76.6',     unit: 'TND', change: '+8%',  up: true  },
  { label: 'Tips',       value: '210',      unit: 'TND', change: '−5%',  up: false },
];

const BY_BARBER = [
  { name: 'Marcus Dupont',  initials: 'MD', color: '#9B59B6', revenue: 680, pct: 100 },
  { name: 'Karim Mansouri', initials: 'KM', color: '#E05C5C', revenue: 520, pct: 76  },
  { name: 'Youssef Belaid', initials: 'YB', color: '#5BBF7A', revenue: 410, pct: 60  },
  { name: 'Sonia Benaissa', initials: 'SB', color: '#F5A623', revenue: 230, pct: 34  },
];

const TOP_SERVICES = [
  { name: 'Classic Cut',   sold: 9, total: '225 TND' },
  { name: 'Full Color',    sold: 3, total: '255 TND' },
  { name: 'Fade',          sold: 6, total: '180 TND' },
  { name: 'Beard Trim',    sold: 5, total: '75 TND'  },
  { name: 'Hot Towel Shave', sold: 3, total: '105 TND' },
];

const PAYMENT_MIX = [
  { method: 'Card',   pct: 58, amount: '1 067 TND', color: '#F5A623' },
  { method: 'Cash',   pct: 31, amount: '570 TND',   color: '#5BBF7A' },
  { method: 'Mobile', pct: 11, amount: '203 TND',   color: '#9B59B6' },
];

/* ── Component ─────────────────────────────────────────────── */
export function ReportsView() {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-line">
        <div>
          <h1 className="text-base font-semibold">Reports</h1>
          <p className="text-xs text-muted mt-0.5">{today}</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-line text-xs font-medium text-muted hover:text-ink hover:border-accent/30 transition-colors">
          <Download size={12} /> Export CSV
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI.map(k => (
            <div key={k.label} className="bg-surface rounded-2xl p-5">
              <div className="text-xs text-muted mb-3">{k.label}</div>
              <div className="font-mono text-2xl font-bold leading-none mb-1">
                {k.value}
                {k.unit && <span className="text-sm font-normal text-muted ml-1">{k.unit}</span>}
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium mt-2 ${k.up ? 'text-success' : 'text-error'}`}>
                {k.up
                  ? <TrendingUp size={11} />
                  : <TrendingDown size={11} />
                }
                {k.change} vs yesterday
              </div>
            </div>
          ))}
        </div>

        {/* Revenue by barber + Top services */}
        <div className="grid grid-cols-2 gap-6">

          {/* Revenue by barber */}
          <div className="bg-surface rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-5">Revenue by Barber</h3>
            <div className="space-y-4">
              {BY_BARBER.map(b => (
                <div key={b.name} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: b.color }}
                  >
                    {b.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium truncate pr-2">{b.name.split(' ')[0]}</span>
                      <span className="font-mono text-xs text-muted shrink-0">{b.revenue} TND</span>
                    </div>
                    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top services */}
          <div className="bg-surface rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-5">Top Services</h3>
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 pb-2 border-b border-line">
                <span className="text-[10px] text-muted">Service</span>
                <span className="text-[10px] text-muted text-right">Sold</span>
                <span className="text-[10px] text-muted text-right">Total</span>
              </div>
              {TOP_SERVICES.map((s, i) => (
                <div key={s.name} className="grid grid-cols-[1fr_auto_auto] gap-4 py-2 border-b border-line/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-muted font-mono w-4 shrink-0">{i + 1}</span>
                    <span className="text-xs truncate">{s.name}</span>
                  </div>
                  <span className="font-mono text-xs text-muted text-right">{s.sold}</span>
                  <span className="font-mono text-xs font-semibold text-accent text-right">{s.total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment mix */}
        <div className="bg-surface rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-5">Payment Mix</h3>
          <div className="space-y-3">
            {PAYMENT_MIX.map(p => (
              <div key={p.method} className="flex items-center gap-4">
                <div className="w-16 text-xs font-medium shrink-0">{p.method}</div>
                <div className="flex-1 h-6 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center pl-2.5 transition-all"
                    style={{ width: `${p.pct}%`, backgroundColor: p.color }}
                  >
                    <span className="text-[10px] font-bold text-bg">{p.pct}%</span>
                  </div>
                </div>
                <div className="font-mono text-xs text-muted w-24 text-right shrink-0">{p.amount}</div>
              </div>
            ))}
          </div>

          {/* Stacked bar summary */}
          <div className="mt-5 h-3 rounded-full overflow-hidden flex">
            {PAYMENT_MIX.map(p => (
              <div
                key={p.method}
                className="h-full"
                style={{ width: `${p.pct}%`, backgroundColor: p.color }}
                title={`${p.method}: ${p.pct}%`}
              />
            ))}
          </div>
          <div className="flex gap-4 mt-2">
            {PAYMENT_MIX.map(p => (
              <div key={p.method} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-[10px] text-muted">{p.method}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
