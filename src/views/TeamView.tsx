import { Coffee, Scissors } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────── */
interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
  status: 'on_shift' | 'on_break';
  now: string;
  backAt?: string;
  cuts: number;
  revenue: string;
  rating: number;
}

/* ── Mock data ─────────────────────────────────────────────── */
const TEAM: TeamMember[] = [
  {
    id: 't1',
    name: 'Karim Mansouri',
    initials: 'KM',
    color: '#E05C5C',
    role: 'Senior Stylist',
    status: 'on_shift',
    now: 'Ahmed Bouzid — Classic Cut',
    cuts: 4,
    revenue: '120 TND',
    rating: 4.9,
  },
  {
    id: 't2',
    name: 'Youssef Belaid',
    initials: 'YB',
    color: '#5BBF7A',
    role: 'Stylist',
    status: 'on_shift',
    now: 'Sami Kaddour — Fade',
    cuts: 3,
    revenue: '90 TND',
    rating: 4.8,
  },
  {
    id: 't3',
    name: 'Marcus Dupont',
    initials: 'MD',
    color: '#9B59B6',
    role: 'Colorist',
    status: 'on_shift',
    now: 'Mehdi Lassoued — Full Color',
    cuts: 2,
    revenue: '210 TND',
    rating: 4.7,
  },
  {
    id: 't4',
    name: 'Sonia Benaissa',
    initials: 'SB',
    color: '#F5A623',
    role: 'Stylist',
    status: 'on_break',
    now: 'Available',
    backAt: '11:00',
    cuts: 2,
    revenue: '65 TND',
    rating: 4.9,
  },
];

/* ── Component ─────────────────────────────────────────────── */
export function TeamView() {
  const onShift  = TEAM.filter(m => m.status === 'on_shift').length;
  const onBreak  = TEAM.filter(m => m.status === 'on_break').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-line">
        <div>
          <h1 className="text-base font-semibold">Team</h1>
          <p className="text-xs text-muted mt-0.5">
            <span className="text-success">{onShift} on shift</span>
            {onBreak > 0 && <span className="text-muted"> · {onBreak} on break</span>}
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 max-w-5xl">
          {TEAM.map(member => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  const isOnShift = member.status === 'on_shift';

  return (
    <div className="bg-surface rounded-2xl p-5 flex flex-col gap-4">

      {/* Avatar + name + status */}
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ backgroundColor: member.color }}
        >
          {member.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{member.name}</div>
          <div className="text-xs text-muted mt-0.5">{member.role}</div>
        </div>
        <div
          className={[
            'flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0',
            isOnShift
              ? 'bg-success/10 text-success'
              : 'bg-accent/10 text-accent',
          ].join(' ')}
        >
          {isOnShift
            ? <><Scissors size={9} /> On shift</>
            : <><Coffee size={9} /> On break</>
          }
        </div>
      </div>

      {/* Now line */}
      <div className="bg-surface-2 rounded-xl px-3 py-2.5">
        <div className="text-[10px] text-muted mb-1 font-medium uppercase tracking-wide">Now</div>
        {isOnShift ? (
          <div className="text-xs font-medium truncate">{member.now}</div>
        ) : (
          <div className="text-xs text-muted">
            {member.backAt ? `Back at ${member.backAt}` : 'Available soon'}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-0 divide-x divide-line border-t border-line pt-3">
        <Stat label="Cuts"    value={String(member.cuts)}  />
        <Stat label="Revenue" value={member.revenue}        mono />
        <Stat label="Rating"  value={`★ ${member.rating}`} mono />
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
