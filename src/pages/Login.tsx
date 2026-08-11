import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { Button, Input } from '@/components/ui';
import { Lock, Mail } from 'lucide-react';

interface Props {
  onLoggedIn: () => void;
}

export default function LoginPage({ onLoggedIn }: Props) {
  const { t, lang, setLang } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (authError) {
      setError(t('loginFailed'));
      return;
    }
    onLoggedIn();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/40 via-slate-950 to-slate-950" />
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="absolute top-4 right-4 flex items-center rounded-lg border border-white/10 overflow-hidden bg-white/5">
          <button
            type="button"
            onClick={() => setLang('tr')}
            className={`px-3 py-1.5 text-xs font-medium ${lang === 'tr' ? 'bg-brand-600 text-white' : 'text-slate-300'}`}
          >
            TR
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-3 py-1.5 text-xs font-medium ${lang === 'en' ? 'bg-brand-600 text-white' : 'text-slate-300'}`}
          >
            EN
          </button>
        </div>

        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white p-2 mb-4 shadow-lg">
              <img src="/final-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{t('assetTracker')}</h1>
            <p className="text-sm text-slate-400 mt-1 text-center">{t('loginSubtitle')}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-xl space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900">{t('login')}</h2>

            <div className="relative">
              <Mail className="absolute left-3 top-[38px] w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                label={t('email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                className="pl-9"
                placeholder="admin@stoktakip.com"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-[38px] w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                label={t('password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="pl-9"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('signingIn') : t('signIn')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
