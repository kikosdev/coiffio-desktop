import { useTranslation } from 'react-i18next';
import { useSignin } from '../../stores/useSignin';
import { StaffCard } from './StaffCard';

function RosterSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-32 rounded-card bg-surface animate-pulse" />
      ))}
    </div>
  );
}

export function LandingView() {
  const { t } = useTranslation('signin');
  const roster       = useSignin((s) => s.roster);
  const rosterLoading = useSignin((s) => s.rosterLoading);
  const pickStaff    = useSignin((s) => s.pickStaff);
  const goManager    = useSignin((s) => s.goManager);

  // D-ROSTER-4
  const onShiftCount = roster.filter((c) => c.onShift).length;
  const totalCount   = roster.length;

  return (
    <div className="flex-1 flex flex-col p-10 overflow-auto">
      <h1 className="text-2xl font-bold text-ink mb-1">{t('landing.title')}</h1>
      <p className="text-muted text-sm mb-1">{t('landing.subtitle')}</p>

      {!rosterLoading && totalCount > 0 && (
        <p className="text-xs text-muted/60 mb-7">
          <span className="text-success font-medium">{onShiftCount} on shift</span>
          {' · '}
          {totalCount} total
        </p>
      )}
      {!rosterLoading && totalCount === 0 && <div className="mb-7" />}
      {rosterLoading && <div className="mb-7" />}

      {rosterLoading ? (
        <RosterSkeleton />
      ) : totalCount === 0 ? (
        // Empty-state ONLY when 0 staff configured (D-ROSTER-3)
        <div className="flex flex-col items-center justify-center py-16 text-muted text-sm gap-2">
          <span className="text-3xl">👤</span>
          <p>No staff configured for this salon.</p>
          <p className="text-xs opacity-60">Ask your manager to enable POS access.</p>
        </div>
      ) : (
        // D-ROSTER-1: show ALL posEnabled staff; off-shift are dimmed (D-ROSTER-2)
        <div className="grid grid-cols-3 gap-4">
          {roster.map((card) => (
            <StaffCard
              key={card.id}
              card={card}
              onPick={() => pickStaff(card.id)}
            />
          ))}
        </div>
      )}

      <div className="mt-auto pt-10">
        <button className="bbprimary max-w-xs" onClick={goManager}>
          {t('landing.managerCta')}
        </button>
      </div>
    </div>
  );
}
