import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, CalendarDays, Users2, BarChart3, Wallet, Lock, Bell, Calendar } from 'lucide-react';
import { NewSaleView } from './views/NewSaleView';
import { TodayBoardView } from './views/TodayBoardView';
import { TeamView } from './views/TeamView';
import { ReportsView } from './views/ReportsView';
import { CaisseView } from './views/CaisseView';
import { formatSalonTime, salonDateKey } from './lib/time';
import { storage } from './lib/storage';
import { connectPosSocket, disconnectPosSocket } from './lib/socket';
import { useBoard } from './stores/useBoard';
import { useNotifStore } from './stores/useNotifStore';
import { NotificationBell } from './components/NotificationBell';

export type View = 'sale' | 'today' | 'caisse' | 'team' | 'reports';

const NAV = [
  { id: 'sale'    as const, label: 'New Sale',      short: 'Sale',    Icon: ShoppingCart },
  { id: 'today'   as const, label: 'Today',         short: 'Today',   Icon: CalendarDays },
  { id: 'caisse'  as const, label: 'Caisse',        short: 'Caisse',  Icon: Wallet },
  { id: 'team'    as const, label: 'Team',          short: 'Team',    Icon: Users2 },
  { id: 'reports' as const, label: 'Reports',       short: 'Reports', Icon: BarChart3 },
];

export function FrontDeskShell() {
  const [view, setView] = useState<View>('today');
  const [time, setTime] = useState(() => new Date());
  const [toast, setToast] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const navigate = useNavigate();

  // D-SIGNIN-7: clock in Africa/Tunis via formatSalonTime
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // History survives app restarts because the server persists it — the client just
  // reloads it on mount rather than trying to keep its own durable copy.
  useEffect(() => {
    useNotifStore.getState().hydrate();
  }, []);

  // Realtime — open once per POS session (not per-tab), so a new appointment is always
  // announced regardless of which internal view is active (New Sale, Team, etc.).
  useEffect(() => {
    connectPosSocket((notif) => {
      setToast(notif.title);
      useNotifStore.getState().push({
        _id: notif._id,
        groupId: notif.groupId,
        title: notif.title,
        body: notif.body,
        date: notif.date,
      });
      const apptDate = salonDateKey(new Date(notif.payload.start));
      if (apptDate === useBoard.getState().date) useBoard.getState().refresh();
    });
    return () => disconnectPosSocket();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const timeStr = formatSalonTime(time);

  function handleLock() {
    disconnectPosSocket();
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

          {/* Calendar — opens a date-picker that drives the Today board, doesn't switch view on its own */}
          <div className="relative w-full">
            <button
              onClick={() => setCalendarOpen((o) => !o)}
              title="Calendar"
              className="w-full rounded-xl flex flex-col items-center justify-center py-2.5 gap-1 transition-all duration-150 text-muted hover:text-ink hover:bg-surface"
            >
              <Calendar size={17} strokeWidth={1.8} />
              <span className="text-[9px] font-semibold tracking-wide leading-none">Calendar</span>
            </button>
            {calendarOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />
                <div className="absolute left-full bottom-0 ml-2 p-3 bg-surface-2 border border-line rounded-2xl shadow-lg z-50 w-56">
                  <label className="text-[10px] font-semibold text-muted block mb-1.5">Go to date</label>
                  <input
                    type="date"
                    defaultValue={useBoard.getState().date}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      useBoard.getState().setDate(e.target.value);
                      setView('today');
                      setCalendarOpen(false);
                    }}
                    className="w-full bg-surface rounded-lg px-2.5 py-1.5 text-xs border border-line focus:outline-none focus:border-accent/40 text-ink"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom: bell + lock + clock + avatar */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <NotificationBell />
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
      <main className="flex-1 overflow-hidden relative">
        {toast && (
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-2 border border-accent/30 shadow-lg">
            <Bell size={14} className="text-accent shrink-0" />
            <span className="text-xs font-medium text-ink">{toast}</span>
          </div>
        )}
        {view === 'sale'    && <NewSaleView />}
        {view === 'today'   && <TodayBoardView onCheckout={() => setView('sale')} />}
        {view === 'caisse'  && <CaisseView />}
        {view === 'team'    && <TeamView />}
        {view === 'reports' && <ReportsView />}
      </main>
    </div>
  );
}
