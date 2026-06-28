import { Clock, Plus, DollarSign, BookOpen, User } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────── */
interface BoardCard {
  id: string;
  client: string;
  service: string;
  barber: string;
  barberColor: string;
  barberInitials: string;
  isBooked: boolean;
  apptTime?: string;
  waitedMin?: number;
  elapsedMin?: number;
  paidAmount?: string;
}

interface TodayBoardViewProps {
  onCheckout: () => void;
}

/* ── Mock data ─────────────────────────────────────────────── */
const WAITING: BoardCard[] = [
  {
    id: 'w1',
    client: 'Ahmed Bouzid',
    service: 'Classic Cut',
    barber: 'Karim',
    barberColor: '#E05C5C',
    barberInitials: 'KM',
    isBooked: true,
    apptTime: '09:30',
    waitedMin: 8,
  },
  {
    id: 'w2',
    client: 'Walk-in',
    service: 'Beard Trim',
    barber: 'Youssef',
    barberColor: '#5BBF7A',
    barberInitials: 'YB',
    isBooked: false,
    waitedMin: 3,
  },
  {
    id: 'w3',
    client: 'Nabil Fersi',
    service: 'Fade',
    barber: 'Sonia',
    barberColor: '#F5A623',
    barberInitials: 'SB',
    isBooked: true,
    apptTime: '10:00',
    waitedMin: 1,
  },
];

const IN_CHAIR: BoardCard[] = [
  {
    id: 'c1',
    client: 'Mehdi Lassoued',
    service: 'Fade',
    barber: 'Youssef',
    barberColor: '#5BBF7A',
    barberInitials: 'YB',
    isBooked: false,
    elapsedMin: 18,
  },
  {
    id: 'c2',
    client: 'Sami Kaddour',
    service: 'Full Color',
    barber: 'Marcus',
    barberColor: '#9B59B6',
    barberInitials: 'MD',
    isBooked: true,
    apptTime: '08:45',
    elapsedMin: 53,
  },
];

const DONE: BoardCard[] = [
  {
    id: 'd1',
    client: 'Omar Trabelsi',
    service: 'Classic Cut',
    barber: 'Karim',
    barberColor: '#E05C5C',
    barberInitials: 'KM',
    isBooked: false,
    paidAmount: '25 TND',
  },
  {
    id: 'd2',
    client: 'Bilal Naceur',
    service: 'Hot Towel Shave',
    barber: 'Youssef',
    barberColor: '#5BBF7A',
    barberInitials: 'YB',
    isBooked: true,
    apptTime: '08:00',
    paidAmount: '35 TND',
  },
  {
    id: 'd3',
    client: 'Rami Chebbi',
    service: 'Beard Trim',
    barber: 'Karim',
    barberColor: '#E05C5C',
    barberInitials: 'KM',
    isBooked: false,
    paidAmount: '15 TND',
  },
];

/* ── Sub-components ────────────────────────────────────────── */
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
    variant === 'amber'   ? 'bg-accent/10 text-accent border-accent/20' :
    variant === 'green'   ? 'bg-success/10 text-success border-success/20' :
                            'bg-surface text-muted border-line';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {children}
    </span>
  );
}

interface ColumnProps {
  title: string;
  cards: BoardCard[];
  accentClass: string;
  onStart?: (id: string) => void;
  onCheckout?: (id: string) => void;
}

function KanbanColumn({ title, cards, accentClass, onStart, onCheckout }: ColumnProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-2 rounded-2xl overflow-hidden">
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-line shrink-0">
        <span className="text-sm font-semibold">{title}</span>
        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${accentClass}`}>
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-20 text-muted text-xs">
            Empty
          </div>
        )}
        {cards.map(card => (
          <div key={card.id} className="bg-surface rounded-xl p-3.5">
            {/* Client + barber */}
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
              <BarberAvatar initials={card.barberInitials} color={card.barberColor} />
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {card.isBooked && card.apptTime && (
                <Badge variant="amber">
                  <BookOpen size={9} /> {card.apptTime}
                </Badge>
              )}
              {!card.isBooked && (
                <Badge>Walk-in</Badge>
              )}
              {card.waitedMin !== undefined && (
                <Badge variant="amber">
                  <Clock size={9} /> Waited {card.waitedMin}min
                </Badge>
              )}
              {card.elapsedMin !== undefined && (
                <Badge variant="green">
                  <Clock size={9} /> {card.elapsedMin}min
                </Badge>
              )}
              {card.paidAmount && (
                <Badge variant="green">
                  <DollarSign size={9} /> {card.paidAmount}
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {onStart && (
                <button
                  onClick={() => onStart(card.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-accent border border-accent/30 hover:bg-accent/10 transition-colors"
                >
                  Start →
                </button>
              )}
              {onCheckout && (
                <button
                  onClick={() => onCheckout(card.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-accent text-bg hover:bg-amber-400 transition-colors"
                >
                  Check out →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main view ─────────────────────────────────────────────── */
export function TodayBoardView({ onCheckout }: TodayBoardViewProps) {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long',
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
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

      {/* Kanban */}
      <div className="flex-1 overflow-hidden p-4 flex gap-4">
        <KanbanColumn
          title="Waiting"
          cards={WAITING}
          accentClass="bg-accent/10 text-accent"
          onStart={() => {}}
        />
        <KanbanColumn
          title="In Chair"
          cards={IN_CHAIR}
          accentClass="bg-success/10 text-success"
          onCheckout={() => onCheckout()}
        />
        <KanbanColumn
          title="Done"
          cards={DONE}
          accentClass="bg-muted/10 text-muted"
        />
      </div>
    </div>
  );
}
