import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { Button, Input } from '@/components/ui';
import { Lock } from 'lucide-react';

interface Props {
  onDone: () => void;
}

export default function ForcePasswordChange({ onDone }: Props) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(t('passwordTooShort'));
      return;
    }
    if (password === '1') {
      setError(t('passwordMustChangeFromDefault'));
      return;
    }
    if (password !== confirm) {
      setError(t('passwordMismatch'));
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Refresh session so metadata updates immediately
    await supabase.auth.refreshSession();
    onDone();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/40 via-slate-950 to-slate-950" />
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-white">{t('changePasswordRequired')}</h1>
            <p className="text-sm text-slate-400 mt-2">{t('changePasswordRequiredDesc')}</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <Input
              label={t('newPassword')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <Input
              label={t('confirmPassword')}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('saving') : t('saveNewPassword')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
