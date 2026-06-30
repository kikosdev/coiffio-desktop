import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Download } from 'lucide-react';
import { api, ApiError } from '../lib/api';

interface OverviewResult {
  kpis: {
    revenue: number;
    appointments: { booked: number; done: number; noShow: number };
    walkins: number;
    tips: number;
  };
  topStylists: { stylistId: string; name: string; revenue: number; bookings: number }[];
  revenueByMethod: { cash: number; card: number; mobile: number };
}

const PAYMENT_COLORS: Record<string, string> = {
  Card:   '#F5A623',
  Cash:   '#5BBF7A',
  Mobile: '#9B59B6',
};

export function ReportsView() {
  const [data,    setData]    = useState<OverviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied,  setDenied]  = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    api.get<OverviewResult>(`/overview?date=${today}`)
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && (err.statusCode === 401 || err.statusCode === 403)) {
          setDenied(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const fmt = (n: number) => n > 0
    ? n.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    : '—';

  const kpis = data
    ? [
        {
          label: 'Revenue',
          value: data.kpis.revenue > 0 ? data.kpis.revenue.toFixed(0) : '—',
          unit: data.kpis.revenue > 0 ? 'TND' : '',
          up: data.kpis.revenue > 0,
        },
        {
          label: 'Bookings',
          value: String(data.kpis.appointments.booked + data.kpis.appointments.done + data.kpis.walkins),
          unit: '',
          up: true,
        },
        {
          label: 'Completed',
          value: String(data.kpis.appointments.done),
          unit: '',
          up: data.kpis.appointments.done > 0,
        },
        {
          label: 'Tips',
          value: data.kpis.tips > 0 ? data.kpis.tips.toFixed(0) : '—',
          unit: data.kpis.tips > 0 ? 'TND' : '',
          up: data.kpis.tips > 0,
        },
      ]
    : null;

  const paymentMix = data
    ? (() => {
        const total = data.revenueByMethod.cash + data.revenueByMethod.card + data.revenueByMethod.mobile;
        if (total === 0) return [];
        return [
          { method: 'Card',   amount: data.revenueByMethod.card,   pct: Math.round((data.revenueByMethod.card   / total) * 100) },
          { method: 'Cash',   amount: data.revenueByMethod.cash,   pct: Math.round((data.revenueByMethod.cash   / total) * 100) },
          { method: 'Mobile', amount: data.revenueByMethod.mobile, pct: Math.round((data.revenueByMethod.mobile / total) * 100) },
        ].filter((p) => p.pct > 0);
      })()
    : [];

  const topRevenue = data?.topStylists?.[0]?.revenue ?? 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-line">
        <div>
          <h1 className="text-base font-semibold">Reports</h1>
          <p className="text-xs text-muted mt-0.5">{today}</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-line text-xs font-medium text-muted hover:text-ink hover:border-accent/30 transition-colors">
          <Download size={12} /> Export CSV
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-5 h-24 animate-pulse" />
            ))}
          </div>
        )}

        {denied && (
          <div className="flex items-center justify-center h-40 text-muted text-sm">
            Reports require a manager or owner account.
          </div>
        )}

        {!loading && !denied && kpis && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((k) => (
                <div key={k.label} className="bg-surface rounded-2xl p-5">
                  <div className="text-xs text-muted mb-3">{k.label}</div>
                  <div className="font-mono text-2xl font-bold leading-none mb-1">
                    {k.value}
                    {k.unit && <span className="text-sm font-normal text-muted ml-1">{k.unit}</span>}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium mt-2 ${k.up ? 'text-success' : 'text-muted'}`}>
                    {k.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    Today
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-surface rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-5">Revenue by Stylist</h3>
                {data!.topStylists.length === 0 ? (
                  <p className="text-xs text-muted">No sales recorded today.</p>
                ) : (
                  <div className="space-y-4">
                    {data!.topStylists.map((s) => {
                      const pct = topRevenue > 0 ? Math.round((s.revenue / topRevenue) * 100) : 0;
                      return (
                        <div key={s.stylistId} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium truncate pr-2">{s.name.split(' ')[0]}</span>
                              <span className="font-mono text-xs text-muted shrink-0">{fmt(s.revenue)} TND</span>
                            </div>
                            <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-accent transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-surface rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-5">Payment Mix</h3>
                {paymentMix.length === 0 ? (
                  <p className="text-xs text-muted">No payments recorded today.</p>
                ) : (
                  <>
                    <div className="space-y-3 mb-5">
                      {paymentMix.map((p) => (
                        <div key={p.method} className="flex items-center gap-4">
                          <div className="w-14 text-xs font-medium shrink-0">{p.method}</div>
                          <div className="flex-1 h-6 bg-surface-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full flex items-center pl-2.5"
                              style={{ width: `${p.pct}%`, backgroundColor: PAYMENT_COLORS[p.method] ?? '#B89968' }}
                            >
                              <span className="text-[10px] font-bold text-bg">{p.pct}%</span>
                            </div>
                          </div>
                          <div className="font-mono text-xs text-muted w-24 text-right shrink-0">
                            {fmt(p.amount)} TND
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="h-3 rounded-full overflow-hidden flex">
                      {paymentMix.map((p) => (
                        <div
                          key={p.method}
                          className="h-full"
                          style={{ width: `${p.pct}%`, backgroundColor: PAYMENT_COLORS[p.method] ?? '#B89968' }}
                          title={`${p.method}: ${p.pct}%`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-4 mt-2">
                      {paymentMix.map((p) => (
                        <div key={p.method} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[p.method] }} />
                          <span className="text-[10px] text-muted">{p.method}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
