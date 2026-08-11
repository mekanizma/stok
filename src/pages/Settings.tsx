import { useEffect, useState } from 'react';
import { PageHeader, Button, Input } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { Database, Shield, Info, Mail, BellRing } from 'lucide-react';
import {
  DEFAULT_STOCK_ALERT_SETTINGS,
  invokeStockAlert,
  loadStockAlertSettings,
  parseEmailList,
  saveStockAlertSettings,
  type StockAlertSettings,
} from '@/lib/stockAlerts';

interface Props {
  canConfigureAlerts?: boolean;
}

export default function SettingsPage({ canConfigureAlerts = false }: Props) {
  const { t } = useI18n();
  const [settings, setSettings] = useState<StockAlertSettings>(DEFAULT_STOCK_ALERT_SETTINGS);
  const [emailsText, setEmailsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [statusInfo, setStatusInfo] = useState<string>('');

  const modules = [
    { nameKey: 'assets' as const, descKey: 'hardwareInventory' as const },
    { nameKey: 'accessories' as const, descKey: 'peripheralTracking' as const },
    { nameKey: 'consumables' as const, descKey: 'consumableInventory' as const },
    { nameKey: 'licenses' as const, descKey: 'softwareLicenseTracking' as const },
    { nameKey: 'users' as const, descKey: 'userManagement' as const },
    { nameKey: 'locations' as const, descKey: 'locationManagement' as const },
  ];

  useEffect(() => {
    if (!canConfigureAlerts) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const s = await loadStockAlertSettings();
        if (!mounted) return;
        setSettings(s);
        setEmailsText(s.emails.join(', '));
        const st = await invokeStockAlert('status').catch(() => null);
        if (mounted && st) {
          const parts = [
            st.hasResendKey ? t('stockAlertResendReady') : t('stockAlertResendMissing'),
            t('stockAlertCriticalCount', { count: Number(st.criticalCount || 0) }),
          ];
          setStatusInfo(parts.join(' · '));
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [canConfigureAlerts, t]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const next: StockAlertSettings = {
        ...settings,
        emails: parseEmailList(emailsText),
        webhook_url: settings.webhook_url.trim(),
        from_email: settings.from_email.trim() || DEFAULT_STOCK_ALERT_SETTINGS.from_email,
        cooldown_hours: Math.min(168, Math.max(1, Number(settings.cooldown_hours) || 24)),
      };
      const saved = await saveStockAlertSettings(next);
      setSettings({ ...DEFAULT_STOCK_ALERT_SETTINGS, ...saved, emails: next.emails });
      setEmailsText(next.emails.join(', '));
      setMessage(t('stockAlertSaved'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError('');
    setMessage('');
    try {
      await handleSaveQuiet();
      await invokeStockAlert('test');
      setMessage(t('stockAlertTestSent'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  };

  const handleSaveQuiet = async () => {
    const next: StockAlertSettings = {
      ...settings,
      emails: parseEmailList(emailsText),
      webhook_url: settings.webhook_url.trim(),
      from_email: settings.from_email.trim() || DEFAULT_STOCK_ALERT_SETTINGS.from_email,
      cooldown_hours: Math.min(168, Math.max(1, Number(settings.cooldown_hours) || 24)),
    };
    const saved = await saveStockAlertSettings(next);
    setSettings({ ...DEFAULT_STOCK_ALERT_SETTINGS, ...saved, emails: next.emails });
  };

  const handleScan = async () => {
    setScanning(true);
    setError('');
    setMessage('');
    try {
      const res = await invokeStockAlert('scan');
      if (res.skipped) setMessage(t('stockAlertDisabled'));
      else if (res.reason === 'no_critical') setMessage(t('stockAlertNoCritical'));
      else if (res.reason === 'cooldown') setMessage(t('stockAlertScanDone'));
      else if (res.sent) setMessage(t('stockAlertScanSent', { count: Number(res.count || 0) }));
      else setMessage(t('stockAlertScanDone'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <PageHeader title={t('settings')} description={t('systemConfig')} />

      <div className="space-y-4">
        {canConfigureAlerts && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-rose-50 text-rose-600">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900">{t('stockAlertTitle')}</h3>
                <p className="text-xs text-gray-500">{t('stockAlertDesc')}</p>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500">{t('loading')}</p>
            ) : (
              <div className="space-y-4">
                <label className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">{t('stockAlertEnabled')}</span>
                    <span className="block text-xs text-gray-500">{t('stockAlertEnabledHint')}</span>
                  </span>
                </label>

                <Input
                  label={t('stockAlertEmails')}
                  value={emailsText}
                  onChange={(e) => setEmailsText(e.target.value)}
                  placeholder="it@final.edu.tr, admin@final.edu.tr"
                />
                <p className="text-xs text-gray-500 -mt-2">{t('stockAlertEmailsHint')}</p>

                <Input
                  label={t('stockAlertFrom')}
                  value={settings.from_email}
                  onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                  placeholder="Stok Uyarı <onboarding@resend.dev>"
                />

                <Input
                  label={t('stockAlertCooldown')}
                  type="number"
                  min={1}
                  max={168}
                  value={String(settings.cooldown_hours)}
                  onChange={(e) => setSettings({ ...settings, cooldown_hours: Number(e.target.value) || 24 })}
                />
                <p className="text-xs text-gray-500 -mt-2">{t('stockAlertCooldownHint')}</p>

                <Input
                  label={t('stockAlertWebhook')}
                  value={settings.webhook_url}
                  onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                  placeholder="https://hooks.zapier.com/..."
                />
                <p className="text-xs text-gray-500 -mt-2">{t('stockAlertWebhookHint')}</p>

                {statusInfo ? (
                  <p className="text-xs text-gray-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-start gap-2">
                    <Mail className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
                    <span>{statusInfo}</span>
                  </p>
                ) : null}

                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  {t('stockAlertResendHint')}
                </p>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                    {saving ? t('saving') : t('save')}
                  </Button>
                  <Button variant="outline" onClick={handleTest} disabled={testing || saving} className="w-full sm:w-auto">
                    {testing ? t('sending') : t('stockAlertSendTest')}
                  </Button>
                  <Button variant="secondary" onClick={handleScan} disabled={scanning || saving} className="w-full sm:w-auto">
                    {scanning ? t('checking') : t('stockAlertScanNow')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 text-brand-600">
              <Info className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">{t('systemInformation')}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">{t('version')}</span>
              <span className="text-sm font-medium text-gray-900">1.0.0</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">{t('database')}</span>
              <span className="text-sm font-medium text-gray-900">{t('databaseSupabase')}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-50 text-violet-600">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">{t('modules')}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {modules.map((m) => (
              <div key={m.nameKey} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t(m.nameKey)}</p>
                  <p className="text-xs text-gray-500">{t(m.descKey)}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t('active')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">{t('about')}</h3>
          </div>
          <p className="text-sm text-gray-600">{t('aboutDesc')}</p>
        </div>
      </div>
    </div>
  );
}
