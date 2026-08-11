import { PageHeader } from '@/components/ui';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { Settings as SettingsIcon, Database, Tag, Shield, Info } from 'lucide-react';

export default function SettingsPage() {
  const { t } = useI18n();

  const modules: { nameKey: TranslationKey; descKey: TranslationKey }[] = [
    { nameKey: 'assets', descKey: 'hardwareInventory' },
    { nameKey: 'accessories', descKey: 'peripheralTracking' },
    { nameKey: 'consumables', descKey: 'consumableInventory' },
    { nameKey: 'licenses', descKey: 'softwareLicenseTracking' },
    { nameKey: 'users', descKey: 'userManagement' },
    { nameKey: 'locations', descKey: 'locationManagement' },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <PageHeader title={t('settings')} description={t('systemConfig')} />

      <div className="space-y-4">
        {/* System info */}
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

        {/* Modules */}
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

        {/* About */}
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
