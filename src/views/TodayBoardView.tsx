import { useEffect, useState } from 'react';
import { Clock, Plus, DollarSign, BookOpen, User, ChevronLeft, ChevronRight, X, UserCheck, Banknote, CreditCard } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useBoard } from '../stores/useBoard';
import { salonDateKey, formatSalonDayLabel } from '../lib/time';
import { isOnShift, type WeekSlot } from '../lib/shift';

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

/** Forme de GET /pos/team — tout staff actif, sans filtre PIN/posEnabled. Le picker de
 *  walk-in a besoin de « qui peut prendre un client », pas de « qui peut ouvrir le
 *  terminal » : /pos/roster (posEnabled: true) est réservé à la connexion par PIN. */
interface TeamCard {
  id: string;
  first: string;
  color: string;
  week: WeekSlot[];
}

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  durationMin: number;
}

interface TodayBoardViewProps {
  onCheckout: () => void;
  onOpenCaisse: () => void;
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
  onSelect: (id: string) => void;
}

function KanbanColumn({ title, cards, accentClass, onCheckout, onSelect }: ColumnProps) {
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
            <div
              key={card.id}
              onClick={() => onSelect(card.id)}
              className="bg-surface rounded-xl p-3.5 cursor-pointer hover:ring-1 hover:ring-accent/30 transition-shadow"
            >
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
                  onClick={(e) => { e.stopPropagation(); onCheckout(); }}
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
  const [roster, setRoster] = useState<TeamCard[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [stylistId, setStylistId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get<TeamCard[]>('/pos/team'), api.get<CatalogItem[]>('/pos/catalog')])
      .then(([r, c]) => { setRoster(r); setCatalog(c); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load stylists and services.'));
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
                <option key={r.id} value={r.id}>
                  {r.first}{isOnShift({ isActive: true, week: r.week }) ? '' : ' (off shift)'}
                </option>
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

// ── Appointment detail modal ────────────────────────────────────────────────

interface PosApptDetail {
  id: string;
  status: string;
  source: string;
  start: string;
  end: string;
  price: number;
  deposit: number | null;
  checkedInAt: string | null;
  column: 'waiting' | 'in_chair' | 'done';
  client: { name: string; phone: string; email: string };
  stylist: { name: string; color: string };
  services: { id: string; name: string; price: number; durationMin: number }[];
}

const STATUS_LABEL: Record<string, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  noshow: 'No-show',
};

const SOURCE_LABEL: Record<string, string> = {
  online: 'Online booking',
  walkin: 'Walk-in',
  phone: 'Phone booking',
};

function fmtMoney(n: number) {
  return `${n.toFixed(3)} TND`;
}

function AppointmentDetailModal({ apptId, onClose, onOpenCaisse }: {
  apptId: string; onClose: () => void; onOpenCaisse: () => void;
}) {
  const [detail, setDetail] = useState<PosApptDetail | null>(null);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');
  /** Le back refuse l'encaissement hors journée de caisse ouverte — on renvoie l'opérateur
   *  vers l'écran Caisse au lieu de le laisser devant un message d'erreur sans issue. */
  const [caisseBlocked, setCaisseBlocked] = useState(false);

  const load = () => {
    setError('');
    return api.get<PosApptDetail>(`/pos/appointments/${apptId}`)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load this appointment.'));
  };

  useEffect(() => {
    setDetail(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptId]);

  async function checkIn() {
    setActing(true);
    setActionError('');
    try {
      await api.post(`/pos/appointments/${apptId}/check-in`);
      await load();
      useBoard.getState().refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not check in.');
    } finally {
      setActing(false);
    }
  }

  async function pay(method: 'cash' | 'card') {
    setActing(true);
    setActionError('');
    setCaisseBlocked(false);
    try {
      await api.post(`/pos/appointments/${apptId}/pay`, { method });
      await load();
      useBoard.getState().refresh();
    } catch (err) {
      const code = err instanceof ApiError ? err.details?.code : undefined;
      if (code === 'CAISSE_NOT_OPEN' || code === 'CAISSE_CLOSED') setCaisseBlocked(true);
      setActionError(err instanceof Error ? err.message : 'Could not record payment.');
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70">
      <div className="w-[420px] bg-surface-2 rounded-2xl border border-line p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Appointment detail</h2>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        {error && <p className="text-xs text-error">{error}</p>}

        {!detail && !error && (
          <div className="py-8 text-center text-muted text-sm">Loading…</div>
        )}

        {detail && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{detail.client.name}</div>
                {(detail.client.phone || detail.client.email) && (
                  <div className="text-xs text-muted mt-0.5">
                    {[detail.client.phone, detail.client.email].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              <BarberAvatar initials={detail.stylist.name.slice(0, 2).toUpperCase()} color={detail.stylist.color} />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant={detail.status === 'completed' ? 'green' : 'amber'}>
                {STATUS_LABEL[detail.status] ?? detail.status}
              </Badge>
              {detail.checkedInAt && detail.status !== 'completed' && (
                <Badge variant="green"><UserCheck size={9} /> In chair</Badge>
              )}
              <Badge>{SOURCE_LABEL[detail.source] ?? detail.source}</Badge>
              <Badge>
                <Clock size={9} /> {fmtTime(detail.start)}–{fmtTime(detail.end)}
              </Badge>
            </div>

            <div>
              <div className="text-[11px] font-medium text-muted mb-1.5">Stylist</div>
              <div className="text-sm">{detail.stylist.name}</div>
            </div>

            <div>
              <div className="text-[11px] font-medium text-muted mb-1.5">Services</div>
              <div className="space-y-1.5">
                {detail.services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span>{s.name} <span className="text-muted text-xs">· {s.durationMin}min</span></span>
                    <span className="font-mono text-xs">{fmtMoney(s.price)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-line pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="font-mono text-sm font-semibold">{fmtMoney(detail.price)}</span>
            </div>
            {detail.deposit != null && (
              <div className="flex items-center justify-between text-xs text-muted -mt-2">
                <span>Deposit paid</span>
                <span className="font-mono">{fmtMoney(detail.deposit)}</span>
              </div>
            )}

            {detail.status === 'completed' ? (
              <div className="text-center text-xs font-semibold text-success py-1">✓ Paid &amp; completed</div>
            ) : detail.status === 'cancelled' ? (
              <div className="text-center text-xs font-semibold text-muted py-1">Cancelled</div>
            ) : (
              <div className="border-t border-line pt-3 space-y-2">
                {!detail.checkedInAt && (
                  <button
                    onClick={checkIn}
                    disabled={acting}
                    className="w-full py-2 rounded-lg text-xs font-semibold bg-surface border border-line text-ink hover:border-accent/40 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <UserCheck size={13} /> Check in
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => pay('cash')}
                    disabled={acting}
                    className="py-2 rounded-lg text-xs font-semibold bg-accent text-bg hover:bg-amber-400 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Banknote size={13} /> Pay cash
                  </button>
                  <button
                    onClick={() => pay('card')}
                    disabled={acting}
                    className="py-2 rounded-lg text-xs font-semibold bg-accent text-bg hover:bg-amber-400 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CreditCard size={13} /> Pay card
                  </button>
                </div>
                {actionError && <p className="text-xs text-error">{actionError}</p>}
                {caisseBlocked && (
                  <button
                    onClick={onOpenCaisse}
                    className="w-full py-2 rounded-lg text-xs font-semibold bg-surface border border-accent/40 text-accent hover:bg-accent/10 transition-colors"
                  >
                    Aller à la caisse
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TodayBoardView({ onCheckout, onOpenCaisse }: TodayBoardViewProps) {
  const { date, refreshToken, setDate, goToday } = useBoard();
  const [appts,   setAppts]   = useState<TodayAppt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get<TodayAppt[]>('/pos/today', { date })
      .then((data) => { setAppts(data); setError(null); })
      .catch((err) => {
        setAppts([]);
        setError(err instanceof Error ? err.message : 'Could not reach the server.');
      })
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
          <button
            onClick={onOpenCaisse}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-line text-xs font-medium text-muted hover:text-ink hover:border-accent/30 transition-colors"
          >
            <DollarSign size={12} /> Open register
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted text-sm">Loading…</div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
          <span className="text-sm font-semibold text-error">Could not load today's board</span>
          <span className="text-xs text-muted max-w-sm">{error}</span>
          <button
            onClick={() => useBoard.getState().refresh()}
            className="mt-2 px-4 py-1.5 rounded-lg text-xs font-medium bg-surface border border-line text-muted hover:text-ink hover:border-accent/30 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden p-4 flex gap-4">
          <KanbanColumn
            title="Waiting"
            cards={waiting}
            accentClass="bg-accent/10 text-accent"
            onSelect={setSelectedApptId}
          />
          <KanbanColumn
            title="In Chair"
            cards={inChair}
            accentClass="bg-success/10 text-success"
            onCheckout={onCheckout}
            onSelect={setSelectedApptId}
          />
          <KanbanColumn
            title="Done"
            cards={done}
            accentClass="bg-muted/10 text-muted"
            onSelect={setSelectedApptId}
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

      {selectedApptId && (
        <AppointmentDetailModal
          apptId={selectedApptId}
          onClose={() => setSelectedApptId(null)}
          onOpenCaisse={onOpenCaisse}
        />
      )}
    </div>
  );
}
