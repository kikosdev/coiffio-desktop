import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, CalendarDays, Users2, BarChart3, Lock } from 'lucide-react';
import { NewSaleView } from './views/NewSaleView';
import { TodayBoardView } from './views/TodayBoardView';
import { TeamView } from './views/TeamView';
import { ReportsView } from './views/ReportsView';
import { formatSalonTime } from './lib/time';
import { storage } from './lib/storage';

export type View = 'sale' | 'today' | 'team' | 'reports';

const NAV = [
  { id: 'sale'    as const, label: 'New Sale', short: 'Sale',    Icon: ShoppingCart },
  { id: 'today'   as const, label: 'Today',    short: 'Today',   Icon: CalendarDays },
  { id: 'team'    as const, label: 'Team',     short: 'Team',    Icon: Users2 },
  { id: 'reports' as const, label: 'Reports',  short: 'Reports', Icon: BarChart3 },
];

export function FrontDeskShell() {
  const [view, setView] = useState<View>('today');
  const [time, setTime] = useState(() => new Date());
  const navigate = useNavigate();

  // D-SIGNIN-7: clock in Africa/Tunis via formatSalonTime
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = formatSalonTime(time);

  function handleLock() {
    storage.clearToken();
    navigate('/signin', { replace: true });
  }

  return (
    <div className="flex h-screen bg-bg text-ink overflow-hidden select-none">

      {/* ── Nav rail ─────────────────────────────────────────── */}
      <nav className="flex flex-col items-center w-[68px] shrink-0 bg-surface-2 border-r border-line py-5 gap-0">

        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-8 shrink-0">
          <span className="font-mono font-bold text-sm text-bg tracking-tight">BB</span>
        </div>

        {/* Nav items */}
        <div className="flex flex-col items-center gap-1 flex-1 w-full px-2">
          {NAV.map(({ id, label, short, Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                title={label}
                className={[
                  'w-full rounded-xl flex flex-col items-center justify-center py-2.5 gap-1 transition-all duration-150',
                  active
                    ? 'bg-accent text-bg'
                    : 'text-muted hover:text-ink hover:bg-surface',
                ].join(' ')}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[9px] font-semibold tracking-wide leading-none">{short}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom: lock + clock + avatar */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <button
            title="Lock screen"
            onClick={handleLock}
            className="text-muted hover:text-ink transition-colors"
          >
            <Lock size={14} strokeWidth={1.8} />
          </button>
          <span className="font-mono text-[10px] text-muted leading-none tabular-nums">{timeStr}</span>
          <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
            <span className="text-[11px] font-bold text-accent">OP</span>
          </div>
        </div>
      </nav>

      {/* ── Content area ─────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">
        {view === 'sale'    && <NewSaleView />}
        {view === 'today'   && <TodayBoardView onCheckout={() => setView('sale')} />}
        {view === 'team'    && <TeamView />}
        {view === 'reports' && <ReportsView />}
      </main>
    </div>
  );
}
