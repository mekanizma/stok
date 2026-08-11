import { type Asset, type UserRecord, type Location, type Category, type Accessory, type Consumable, type License } from '@/lib/supabase';
import { Boxes, CheckCircle2, TrendingUp, Users, MapPin, Package, KeyRound, PackageCheck, ArrowRight, Activity } from 'lucide-react';
import { type Page } from '@/App';
import { StatusBadge, Avatar } from '@/components/ui';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { supabase, type CheckoutHistory } from '@/lib/supabase';
import { getAssetDisplayName } from '@/lib/assetAssignee';
import { canAccessPage, type AppRole } from '@/lib/roles';

interface Props {
  assets: Asset[];
  users: UserRecord[];
  locations: Location[];
  categories: Category[];
  accessories: Accessory[];
  consumables: Consumable[];
  licenses: License[];
  navigate: (p: Page) => void;
  appRole?: AppRole;
}

export default function Dashboard({ assets, users, locations, categories, accessories, consumables, licenses, navigate, appRole = 'admin' }: Props) {
  const { t, tn, lang } = useI18n();
  const [history, setHistory] = useState<CheckoutHistory[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('checkout_history')
        .select('*, asset:assets(*), assigned_to:users(*)')
        .order('created_at', { ascending: false })
        .limit(8);
      setHistory((data as CheckoutHistory[]) || []);
    })();
  }, []);

  const ready = assets.filter((a) => a.status === 'ready').length;
  const deployed = assets.filter((a) => a.status === 'deployed').length;

  const stats: {
    label: string;
    value: number;
    icon: typeof Boxes;
    iconBg: string;
    page: Page['name'];
  }[] = [
    { label: t('totalAssets'), value: assets.length, icon: Boxes, iconBg: 'bg-brand-600', page: 'categories' },
    { label: t('readyToDeploy'), value: ready, icon: CheckCircle2, iconBg: 'bg-emerald-600', page: 'checked-in-assets' },
    { label: t('deployed'), value: deployed, icon: TrendingUp, iconBg: 'bg-blue-600', page: 'deployed-assets' },
  ];

  const secondaryStats = (
    [
      { label: t('users'), value: users.length, icon: Users, bg: 'bg-violet-50', iconBg: 'bg-violet-600', page: 'users' as const },
      { label: t('locations'), value: locations.length, icon: MapPin, bg: 'bg-amber-50', iconBg: 'bg-amber-600', page: 'locations' as const },
      { label: t('accessories'), value: accessories.length, icon: Package, bg: 'bg-cyan-50', iconBg: 'bg-cyan-600', page: 'accessories' as const },
      { label: t('consumables'), value: consumables.length, icon: PackageCheck, bg: 'bg-orange-50', iconBg: 'bg-orange-600', page: 'consumables' as const },
      { label: t('licenses'), value: licenses.length, icon: KeyRound, bg: 'bg-teal-50', iconBg: 'bg-teal-600', page: 'licenses' as const },
      { label: t('categories'), value: categories.length, icon: Boxes, bg: 'bg-slate-50', iconBg: 'bg-slate-600', page: 'categories' as const },
    ] as const
  ).filter((s) => canAccessPage(appRole, s.page));

  // Category distribution
  const categoryDist = categories
    .filter((c) => c.type === 'asset')
    .map((c) => ({
      name: tn(c.name),
      count: assets.filter((a) => a.category_id === c.id).length,
      color: c.color,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...categoryDist.map((c) => c.count), 1);

  // Recently added assets
  const recentAssets = assets.slice(0, 5);

  const formatDate = (date: string) => new Date(date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US');

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Welcome banner */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-brand-600 to-brand-800 p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">{t('itAssetDashboard')}</h1>
        <p className="text-brand-100 text-sm">{t('dashboardSubtitle')}</p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => navigate({ name: s.page } as Page)}
              className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md hover:border-brand-300 transition-all text-left w-full"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${s.iconBg} text-white`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-6">
        {/* Category distribution */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{t('assetsByCategory')}</h3>
          {categoryDist.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t('noDataYet')}</p>
          ) : (
            <div className="space-y-3">
              {categoryDist.map((c) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-28 shrink-0 truncate">{c.name}</span>
                  <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden min-w-0">
                    <div
                      className="h-full bg-brand-600 rounded-lg flex items-center justify-end px-2 transition-all duration-500"
                      style={{ width: `${(c.count / maxCount) * 100}%` }}
                    >
                      <span className="text-xs font-semibold text-white">{c.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {secondaryStats.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => navigate({ name: s.page } as Page)}
              className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md hover:border-brand-300 transition-all text-left"
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${s.iconBg} text-white mb-2`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent assets */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">{t('recentlyAdded')}</h3>
            <button onClick={() => navigate({ name: 'deployed-assets' })} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              {t('viewAll')} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {recentAssets.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate({ name: 'asset-detail', id: a.id })}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-500 shrink-0">
                  <Boxes className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{getAssetDisplayName(a)}</p>
                  <p className="text-xs text-gray-500">{a.asset_tag}</p>
                </div>
                <StatusBadge status={a.status} />
              </button>
            ))}
            {recentAssets.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">{t('noAssetsYet')}</p>}
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">{t('recentActivity')}</h3>
            <button onClick={() => navigate({ name: 'activity' })} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              {t('viewAll')} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="flex items-start gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5 ${
                  h.action === 'checkout' ? 'bg-blue-50 text-blue-600' : h.action === 'checkin' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium capitalize">{t(h.action as TranslationKey)}</span>
                    {h.asset?.name && <span className="text-gray-500"> — {h.asset.name}</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {h.performed_by_name || h.performed_by_email
                      ? `${t('performedBy')}: ${h.performed_by_name || h.performed_by_email}`
                      : t('system')}
                    {' · '}
                    {formatDate(h.created_at)}
                  </p>
                </div>
              </div>
            ))}
            {history.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">{t('noActivityYet')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
