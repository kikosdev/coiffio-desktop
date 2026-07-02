import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifStore } from '../stores/useNotifStore';
import { formatSalonTime } from '../lib/time';

export function NotificationBell() {
  const { items, unread, markAllRead } = useNotifStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        title="Notifications"
        onClick={() => { setOpen((o) => !o); if (!open) markAllRead(); }}
        className="relative text-muted hover:text-ink transition-colors"
      >
        <Bell size={16} strokeWidth={1.8} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-[3px] rounded-full bg-accent text-bg text-[9px] font-bold leading-[15px] text-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-full bottom-0 ml-2 w-72 max-h-96 overflow-y-auto bg-surface-2 border border-line rounded-2xl shadow-lg z-50">
            <div className="px-4 py-3 border-b border-line">
              <span className="text-xs font-semibold text-ink">Notifications</span>
            </div>
            {items.length === 0 ? (
              <div className="px-4 py-6 text-xs text-muted text-center">No notifications yet</div>
            ) : (
              items.map((n) => (
                <div key={n._id} className="px-4 py-3 border-b border-line last:border-b-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-ink">{n.title}</span>
                    <span className="text-[10px] text-muted font-mono shrink-0">{formatSalonTime(new Date(n.date))}</span>
                  </div>
                  <div className="text-[11px] text-muted">{n.body}</div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
