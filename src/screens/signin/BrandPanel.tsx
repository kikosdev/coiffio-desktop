import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatSalonTime, getSalonGreeting } from '../../lib/time';
import { colors } from '../../theme/blackbox';
import i18n from '../../i18n';

const STATS = [
  { key: 'bookedToday', value: '--' },
  { key: 'barbersOn',   value: '--', accent: true },
  { key: 'inQueue',     value: '--' },
];

export function BrandPanel() {
  const { t } = useTranslation('signin');
  const [now, setNow] = useState(() => new Date());

  // D-SIGNIN-7: live clock in Africa/Tunis
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clockStr = formatSalonTime(now);
  const greeting = getSalonGreeting(now);
  const greetKey = `brand.greeting_${greeting}` as const;

  return (
    <div
      className="relative flex flex-col w-[560px] shrink-0 h-full bg-surface-2 overflow-hidden"
    >
      {/* Decorative radial halo — accent at 8% opacity */}
      <div
        className="absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${colors.accent}14 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col h-full p-10 gap-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-card flex items-center justify-center text-bg font-black text-base"
            style={{ backgroundColor: colors.accent }}
          >
            BB
          </div>
          <div>
            <p className="text-ink font-black text-sm tracking-widest">BLACK BOX</p>
            <p className="text-muted text-[10px] tracking-widest font-semibold">POS</p>
          </div>
        </div>

        {/* Greeting + tagline */}
        <div className="flex flex-col gap-2">
          <p className="text-muted text-xs font-bold tracking-[0.2em]">
            {t(greetKey)}
          </p>
          <h2 className="text-ink text-3xl font-black leading-tight">
            {t('brand.tagline')}
          </h2>
        </div>

        {/* Live stats */}
        <div className="flex gap-4">
          {STATS.map(({ key, value, accent }) => (
            <div
              key={key}
              className="flex-1 bg-surface rounded-card p-4 flex flex-col gap-1 border border-line"
            >
              <p
                className="text-2xl font-black"
                style={{ color: accent ? colors.accent : undefined }}
              >
                {/* SWAP: GET /pos/summary */}
                {value}
              </p>
              <p className="text-muted text-xs leading-tight">{t(`brand.${key}`)}</p>
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Top-right clock + shop status — rendered inside the panel */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-ink text-xs font-semibold">
              {t('brand.shopOpen')} · {t('brand.shopClose')}
            </span>
          </div>
          <span className="text-ink font-mono text-sm font-semibold tabular-nums">
            {clockStr}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-line">
          <div className="flex flex-col gap-0.5">
            <p className="text-muted text-xs">Tunis, Tunisia</p>
            <p className="text-muted text-[10px]">{t('brand.version')}</p>
          </div>

          {/* Language toggle */}
          <div className="flex gap-1.5">
            {(['fr', 'ar'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => i18n.changeLanguage(lang)}
                className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest transition-colors ${
                  i18n.language === lang
                    ? 'bg-accent text-bg'
                    : 'bg-surface text-muted hover:text-ink border border-line'
                }`}
              >
                {lang === 'fr' ? t('brand.langFr') : t('brand.langAr')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

