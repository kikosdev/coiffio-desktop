import { useEffect, useState } from 'react';
import { Clock, Plus, DollarSign, BookOpen, User } from 'lucide-react';
import { api } from '../lib/api';

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

export function TodayBoardView({ onCheckout }: TodayBoardViewProps) {
  const [appts,   setAppts]   = useState<TodayAppt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<TodayAppt[]>('/pos/today')
      .then(setAppts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const waiting  = appts.filter((a) => a.column === 'waiting');
  const inChair  = appts.filter((a) => a.column === 'in_chair');
  const done     = appts.filter((a) => a.column === 'done');

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long',
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">

      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-line">
        <div>
          <h1 className="text-base font-semibold">Today</h1>
          <p className="text-xs text-muted mt-0.5">{today}</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-line text-xs font-medium text-muted hover:text-ink hover:border-accent/30 transition-colors">
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
    </div>
  );
}
