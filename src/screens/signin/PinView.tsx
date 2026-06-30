import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useSignin } from '../../stores/useSignin';
import { staffAvatarColor } from '../../theme/blackbox';
import { colors } from '../../theme/blackbox';

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function PinView() {
  const { t } = useTranslation('signin');
  const navigate = useNavigate();

  const selStaffId = useSignin((s) => s.selStaffId);
  const roster = useSignin((s) => s.roster);
  const pin = useSignin((s) => s.pin);
  const error = useSignin((s) => s.error);
  const unlocked = useSignin((s) => s.unlocked);
  const lockMsg = useSignin((s) => s.lockMsg);
  const pressKey = useSignin((s) => s.pressKey);
  const submitPin = useSignin((s) => s.submitPin);
  const back = useSignin((s) => s.back);

  const staff = roster.find((c) => c.id === selStaffId);
  const avatarBg = staff ? staff.color || staffAvatarColor(staff.id) : colors.muted;

  // Auto-submit when 4th digit entered
  useEffect(() => {
    if (pin.length === 4 && !unlocked) {
      submitPin(navigate);
    }
  }, [pin, unlocked, submitPin, navigate]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 gap-6">
      {/* Back */}
      <button
        className="self-start text-muted text-sm hover:text-ink transition-colors flex items-center gap-1"
        onClick={back}
      >
        ← {t('pin.notYou')}
      </button>

      {/* Staff avatar */}
      <div className="relative">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-bg text-3xl font-bold"
          style={{ backgroundColor: avatarBg }}
        >
          {staff?.initial ?? '?'}
        </div>

        {/* Success overlay */}
        {unlocked && (
          <div className="bbpop absolute inset-0 rounded-full bg-success flex items-center justify-center">
            <Check size={32} color="#0E0E0F" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Staff name */}
      <p className="text-ink text-lg font-semibold">{staff?.first ?? ''}</p>

      {/* Hint text */}
      <p className={`text-sm ${error ? 'text-error' : 'text-muted'}`}>
        {lockMsg
          ? lockMsg
          : error
          ? t('pin.errorHint')
          : t('pin.hint')}
      </p>

      {/* PIN dots */}
      <div className={`flex gap-3 ${error ? 'bbshake' : ''}`}>
        {[0, 1, 2, 3].map((i) => {
          const filled = i < pin.length;
          return (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-colors duration-150 ${
                error
                  ? 'bg-error'
                  : filled
                  ? 'bg-accent'
                  : 'bg-surface border border-line'
              }`}
            />
          );
        })}
      </div>

      {/* Number pad */}
      <div
        className="grid grid-cols-3 gap-3"
        style={{ opacity: unlocked ? 0.4 : 1, pointerEvents: unlocked ? 'none' : 'auto' }}
      >
        {PAD_KEYS.map((key, i) =>
          key === '' ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              className="bbkey"
              onClick={() => pressKey(key)}
              disabled={!!lockMsg}
            >
              {key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
