import { useEffect, useState } from 'react';
import { Clock, Coffee, Scissors } from 'lucide-react';
import { api } from '../lib/api';
import { getShiftStatus, type ShiftStatus, type WeekSlot } from '../lib/shift';

interface RosterCard {
  id: string;
  first: string;
  initial: string;
  color: string;
  role: string;
  pro: boolean;
  week: WeekSlot[];
}

interface TodayAppt {
  id: string;
  client: string;
  service: string;
  stylistId: string;
  price: number;
  status: string;
  column: 'waiting' | 'in_chair' | 'done';
}

function staffStats(staffId: string, appts: TodayAppt[]) {
  const mine = appts.filter((a) => a.stylistId === staffId);
  const done = mine.filter((a) => a.status === 'completed');
  const inChair = mine.find((a) => a.column === 'in_chair');
  return {
    cuts: done.length,
    revenue: done.reduce((s, a) => s + a.price, 0),
    inChair: inChair ?? null,
  };
}

export function TeamView() {
  const [roster,    setRoster]    = useState<RosterCard[]>([]);
  const [appts,     setAppts]     = useState<TodayAppt[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [now,       setNow]       = useState(() => new Date());

  useEffect(() => {
    Promise.all([
      api.get<RosterCard[]>('/pos/team'),
      api.get<TodayAppt[]>('/pos/today'),
    ])
      .then(([r, t]) => { setRoster(r); setAppts(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const shiftStatus = (member: RosterCard): ShiftStatus =>
    getShiftStatus({ isActive: true, week: member.week }, undefined, now);

  const onShift = roster.filter((m) => shiftStatus(m) === 'on-shift').length;
  const total   = roster.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-line">
        <div>
          <h1 className="text-base font-semibold">Team</h1>
          <p className="text-xs text-muted mt-0.5">
            {loading ? (
              <span className="text-muted">Loading…</span>
            ) : (
              <>
                <span className="text-success">{onShift} on shift</span>
                {total > 0 && <span className="text-muted"> · {total} total</span>}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 max-w-5xl">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-5 h-44 animate-pulse" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted text-sm">
            No staff configured for this salon.
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 max-w-5xl">
            {roster.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                status={shiftStatus(member)}
                appts={appts}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_META: Record<ShiftStatus, { label: string; icon: typeof Scissors; badgeClass: string }> = {
  'on-shift': { label: 'On shift',   icon: Scissors, badgeClass: 'bg-success/10 text-success' },
  'on-break': { label: 'On break',   icon: Coffee,   badgeClass: 'bg-surface-2 text-muted' },
  off:        { label: 'Off today',  icon: Clock,    badgeClass: 'bg-surface-2 text-muted' },
};

function MemberCard({ member, status, appts }: { member: RosterCard; status: ShiftStatus; appts: TodayAppt[] }) {
  const { cuts, revenue, inChair } = staffStats(member.id, appts);
  const isOnShift = status === 'on-shift';
  const { label, icon: StatusIcon, badgeClass } = STATUS_META[status];

  return (
    <div className={`bg-surface rounded-2xl p-5 flex flex-col gap-4 transition-opacity ${isOnShift ? '' : 'opacity-50'}`}>

      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ backgroundColor: member.color }}
        >
          {member.initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{member.first}</div>
          <div className="text-xs text-muted mt-0.5 capitalize">{member.role}</div>
        </div>
        <div
          className={[
            'flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0',
            badgeClass,
          ].join(' ')}
        >
          <StatusIcon size={9} /> {label}
        </div>
      </div>

      <div className="bg-surface-2 rounded-xl px-3 py-2.5">
        <div className="text-[10px] text-muted mb-1 font-medium uppercase tracking-wide">Now</div>
        {inChair ? (
          <div className="text-xs font-medium truncate">
            {inChair.client} — {inChair.service}
          </div>
        ) : (
          <div className="text-xs text-muted">{label}</div>
        )}
      </div>

      <div className="flex gap-0 divide-x divide-line border-t border-line pt-3">
        <Stat label="Cuts"    value={cuts > 0 ? String(cuts) : '—'}                        />
        <Stat label="Revenue" value={revenue > 0 ? `${revenue.toFixed(3)} TND` : '—'} mono />
        <Stat label="Rating"  value="—"                                               mono />
      </div>
    </div>
  );
}

function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex-1 text-center px-2">
      <div className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`}>{value}</div>
      <div className="text-[10px] text-muted mt-0.5">{label}</div>
    </div>
  );
}
