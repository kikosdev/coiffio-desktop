import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useSignin } from '../../stores/useSignin';

export function ManagerView() {
  const { t } = useTranslation('signin');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const managerError = useSignin((s) => s.managerError);
  const managerLogin = useSignin((s) => s.managerLogin);
  const back = useSignin((s) => s.back);

  const canSubmit = email.trim().length >= 3 && password.length >= 4;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 gap-6 max-w-sm mx-auto w-full">
      {/* Back */}
      <button
        className="self-start text-muted text-sm hover:text-ink transition-colors flex items-center gap-1"
        onClick={back}
      >
        ← {t('manager.back')}
      </button>

      {/* Lock icon */}
      <div className="w-14 h-14 rounded-full bg-surface border border-line flex items-center justify-center">
        <Lock size={24} className="text-muted" />
      </div>

      <h2 className="text-xl font-bold text-ink">{t('manager.title')}</h2>

      {/* Email field */}
      <div className="bbfield w-full">
        <Mail size={16} className="text-muted shrink-0" />
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('manager.emailPlaceholder')}
          autoCapitalize="none"
          autoComplete="username"
          className="flex-1 bg-transparent text-ink text-sm outline-none placeholder:text-muted"
        />
      </div>

      {/* Password field */}
      <div className="bbfield w-full">
        <Lock size={16} className="text-muted shrink-0" />
        <input
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('manager.passwordPlaceholder')}
          autoComplete="current-password"
          className="flex-1 bg-transparent text-ink text-sm outline-none placeholder:text-muted"
        />
        <button
          onClick={() => setShowPw((v) => !v)}
          className="text-muted hover:text-ink transition-colors"
          tabIndex={-1}
        >
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {/* Forgot link */}
      <div className="self-end -mt-3">
        <span className="text-accent text-xs cursor-pointer hover:underline">
          {t('manager.forgot')}
        </span>
      </div>

      {/* Error */}
      {managerError && (
        <p className="text-error text-sm w-full">{managerError}</p>
      )}

      {/* CTA */}
      <button
        className="bbprimary w-full"
        disabled={!canSubmit}
        style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
        onClick={() => managerLogin(email, password, navigate)}
      >
        {t('manager.cta')}
      </button>

      {/* Owner note */}
      <p className="text-muted text-xs text-center leading-relaxed">
        {t('manager.ownerNote')}
      </p>
    </div>
  );
}
