import { staffAvatarColor } from '../../theme/blackbox';
import type { RosterCard } from '../../stores/useSignin';

interface Props {
  card: RosterCard;
  onPick: () => void;
}

export function StaffCard({ card, onPick }: Props) {
  const bg = card.color || staffAvatarColor(card.id);

  // D-ROSTER-2: off-shift cards are visible but disabled
  if (!card.onShift) {
    return (
      <div
        className="bbstaff text-left w-full cursor-default"
        style={{ opacity: 0.45, pointerEvents: 'none' }}
      >
        <div className="relative">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-bg text-xl font-bold"
            style={{ backgroundColor: bg }}
          >
            {card.initial}
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5 w-full">
          <div className="flex items-center gap-1.5">
            <span className="text-ink text-sm font-semibold">{card.first}</span>
          </div>
          <span className="text-muted text-xs">Off shift</span>
        </div>
      </div>
    );
  }

  return (
    <button className="bbstaff text-left w-full" onClick={onPick}>
      <div className="relative">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-bg text-xl font-bold"
          style={{ backgroundColor: bg }}
        >
          {card.initial}
        </div>
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-success border-2 border-bg" />
      </div>

      <div className="flex flex-col items-center gap-0.5 w-full">
        <div className="flex items-center gap-1.5">
          <span className="text-ink text-sm font-semibold">{card.first}</span>
          {card.pro && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/20 text-accent leading-none">
              PRO
            </span>
          )}
        </div>
        <span className="text-muted text-xs">{card.statusLabel}</span>
      </div>
    </button>
  );
}
