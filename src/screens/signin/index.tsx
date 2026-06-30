import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSignin } from '../../stores/useSignin';
import { BrandPanel } from './BrandPanel';
import { LandingView } from './LandingView';
import { PinView } from './PinView';
import { ManagerView } from './ManagerView';
import './signin.css';

export function SignInScreen() {
  const { i18n } = useTranslation();
  const view = useSignin((s) => s.view);
  const loadRoster = useSignin((s) => s.loadRoster);

  // RTL: set document dir based on current language.
  // Only this screen sets RTL — the rest of the app is LTR.
  useEffect(() => {
    const isRtl = i18n.language === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
    return () => {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'fr';
    };
  }, [i18n.language]);

  // Load roster on mount
  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  return (
    <div className="flex h-screen bg-bg text-ink overflow-hidden select-none font-sans">
      <BrandPanel />
      <div className="flex-1 flex flex-col overflow-hidden">
        {view === 'landing' && <LandingView />}
        {view === 'pin'     && <PinView />}
        {view === 'manager' && <ManagerView />}
      </div>
    </div>
  );
}
