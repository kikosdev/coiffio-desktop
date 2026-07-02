import { useEffect, useState } from 'react';
import { Clock, Plus, DollarSign, BookOpen, User, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api } from '../lib/api';
import { useBoard } from '../stores/useBoard';
import { salonDateKey, formatSalonDayLabel } from '../lib/time';

interface TodayAppt {
  id: string;
  client: string;
  service: string;
  stylist: string;
  stylistInitials: string;
  stylistColor: string;
  isBooked: boolean;
  start: string;
  price: number;
  status: string;
  column: 'waiting' | 'in_chair' | 'done';
}

interface RosterCard {
  id: string;
  first: string;
  color: string;
  onShift: boolean;
}

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  durationMin: number;
}

interface TodayBoardViewProps {
  onCheckout: () => void;
}

function BarberAvatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'amber' | 'green' | 'default' }) {
  const cls =
    variant === 'amber'  ? 'bg-accent/10 text-accent border-accent/20' :
    variant === 'green'  ? 'bg-success/10 text-success border-success/20' :
                           'bg-surface text-muted border-line';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {children}
    </span>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtPrice(n: number) {
  return n > 0 ? `${n.toFixed(3)} TND` : null;
}

interface ColumnProps {
  title: string;
  cards: TodayAppt[];
  accentClass: string;
  onCheckout?: () => void;
}

function KanbanColumn({ title, cards, accentClass, onCheckout }: ColumnProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-2 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-line shrink-0">
        <span className="text-sm font-semibold">{title}</span>
        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${accentClass}`}>
          {cards.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-20 text-muted text-xs">Empty</div>
        )}
        {cards.map((card) => {
          const paid = fmtPrice(card.price);
          return (
            <div key={card.id} className="bg-surface rounded-xl p-3.5">
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {card.isBooked
                      ? <BookOpen size={11} className="text-accent shrink-0" />
                      : <User size={11} className="text-muted shrink-0" />
                    }
                    <span className="text-sm font-medium truncate">{card.client}</span>
                  </div>
                  <span className="text-xs text-muted">{card.service}</span>
                </div>
                <BarberAvatar initials={card.stylistInitials} color={card.stylistColor} />
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {card.isBooked && (
                  <Badge variant="amber">
                    <BookOpen size={9} /> {fmtTime(card.start)}
                  </Badge>
                )}
                {!card.isBooked && <Badge>Walk-in</Badge>}
                {card.column === 'waiting' && (
                  <Badge variant="amber"><Clock size={9} /> Waiting</Badge>
                )}
                {card.column === 'in_chair' && (
                  <Badge variant="green"><Clock size={9} /> In chair</Badge>
                )}
                {paid && (
                  <Badge variant="green"><DollarSign size={9} /> {paid}</Badge>
                )}
              </div>

              {onCheckout && card.column === 'in_chair' && (
                <button
                  onClick={onCheckout}
                  className="w-full py-1.5 rounded-lg text-xs font-semibold bg-accent text-bg hover:bg-amber-400 transition-colors"
                >
                  Check out →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Add walk-in modal ───────────────────────────────────────────────────────

function AddWalkinModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [roster, setRoster] = useState<RosterCard[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [stylistId, setStylistId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get<RosterCard[]>('/pos/roster'), api.get<CatalogItem[]>('/pos/catalog')])
      .then(([r, c]) => { setRoster(r); setCatalog(c); })
      .catch(() => {});
  }, []);

  const canSubmit = !!stylistId && !!serviceId && clientName.trim() !== '' && clientPhone.trim() !== '';

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/pos/walkin', {
        stylistId,
        serviceIds: [serviceId],
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the walk-in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70">
      <div className="w-[420px] bg-surface-2 rounded-2xl border border-line p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Add walk-in</h2>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted block mb-1">Stylist</label>
            <select
              value={stylistId}
              onChange={(e) => setStylistId(e.target.value)}
              className="w-full bg-surface rounded-lg px-3 py-2 text-sm border border-line focus:outline-none focus:border-accent/40"
            >
              <option value="">Select a stylist…</option>
              {roster.map((r) => (
                <option key={r.id} value={r.id}>{r.first}{r.onShift ? '' : ' (off shift)'}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted block mb-1">Service</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full bg-surface rounded-lg px-3 py-2 text-sm border border-line focus:outline-none focus:border-accent/40"
            >
              <option value="">Select a service…</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.durationMin}min · {c.price.toFixed(3)} TND</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted block mb-1">Client name</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Walk-in client"
              className="w-full bg-surface rounded-lg px-3 py-2 text-sm border border-line focus:outline-none focus:border-accent/40"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted block mb-1">Phone</label>
            <input
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+216 …"
              className="w-full bg-surface rounded-lg px-3 py-2 text-sm border border-line focus:outline-none focus:border-accent/40"
            />
          </div>
        </div>

        {error && <p className="text-xs text-error mt-3">{error}</p>}

        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold bg-accent text-bg disabled:opacity-40 hover:bg-amber-400 transition-colors"
        >
          {submitting ? 'Adding…' : 'Add to Waiting'}
        </button>
      </div>
    </div>
  );
}

export function TodayBoardView({ onCheckout }: TodayBoardViewProps) {
  const { date, refreshToken, setDate, goToday } = useBoard();
  const [appts,   setAppts]   = useState<TodayAppt[]>([]);
  const [loading, setLoading] = useState(true);
  const [walkinOpen, setWalkinOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<TodayAppt[]>('/pos/today', { date })
      .then(setAppts)
      .catch(() => setAppts([]))
      .finally(() => setLoading(false));
  }, [date, refreshToken]);

  const waiting  = appts.filter((a) => a.column === 'waiting');
  const inChair  = appts.filter((a) => a.column === 'in_chair');
  const done     = appts.filter((a) => a.column === 'done');

  const isToday = date === salonDateKey(new Date());
  const shiftDay = (deltaDays: number) => {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + deltaDays);
    setDate(salonDateKey(d));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold">{isToday ? 'Today' : formatSalonDayLabel(date)}</h1>
            <button onClick={() => shiftDay(-1)} className="text-muted hover:text-ink" title="Previous day">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => shiftDay(1)} className="text-muted hover:text-ink" title="Next day">
              <ChevronRight size={14} />
            </button>
            {!isToday && (
              <button
                onClick={goToday}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
                Today
              </button>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">{formatSalonDayLabel(date)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWalkinOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-line text-xs font-medium text-muted hover:text-ink hover:border-accent/30 transition-colors"
          >
            <Plus size={12} /> Add walk-in
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-line text-xs font-medium text-muted hover:text-ink hover:border-accent/30 transition-colors">
            <DollarSign size={12} /> Open register
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted text-sm">Loading…</div>
      ) : (
        <div className="flex-1 overflow-hidden p-4 flex gap-4">
          <KanbanColumn
            title="Waiting"
            cards={waiting}
            accentClass="bg-accent/10 text-accent"
          />
          <KanbanColumn
            title="In Chair"
            cards={inChair}
            accentClass="bg-success/10 text-success"
            onCheckout={onCheckout}
          />
          <KanbanColumn
            title="Done"
            cards={done}
            accentClass="bg-muted/10 text-muted"
          />
        </div>
      )}

      {walkinOpen && (
        <AddWalkinModal
          onClose={() => setWalkinOpen(false)}
          onCreated={() => {
            setWalkinOpen(false);
            if (!isToday) goToday();
            useBoard.getState().refresh();
          }}
        />
      )}
    </div>
  );
}
