import { type Asset, type UserRecord, type Location, type Category, type Accessory, type Consumable, type License } from '@/lib/supabase';
import { Boxes, CheckCircle2, AlertTriangle, Wrench, TrendingUp, Users, MapPin, Package, KeyRound, PackageCheck, ArrowRight, Activity } from 'lucide-react';
import { type Page } from '@/App';
import { StatusBadge, Avatar } from '@/components/ui';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { supabase, type CheckoutHistory } from '@/lib/supabase';

interface Props {
  assets: Asset[];
  users: UserRecord[];
  locations: Location[];
  categories: Category[];
  accessories: Accessory[];
  consumables: Consumable[];
  licenses: License[];
  navigate: (p: Page) => void;
}

export default function Dashboard({ assets, users, locations, categories, accessories, consumables, licenses, navigate }: Props) {
  const { t, lang } = useI18n();
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
  const broken = assets.filter((a) => a.status === 'broken').length;
  const pending = assets.filter((a) => a.status === 'pending').length;
  const lost = assets.filter((a) => a.status === 'lost').length;

  const totalValue = assets.reduce((sum, a) => sum + (a.purchase_cost || 0), 0);

  const stats = [
    { label: t('totalAssets'), value: assets.length, icon: Boxes, bg: 'bg-brand-50', iconBg: 'bg-brand-600' },
    { label: t('readyToDeploy'), value: ready, icon: CheckCircle2, bg: 'bg-emerald-50', iconBg: 'bg-emerald-600' },
    { label: t('deployed'), value: deployed, icon: TrendingUp, bg: 'bg-blue-50', iconBg: 'bg-blue-600' },
    { label: t('brokenLost'), value: broken + lost, icon: AlertTriangle, bg: 'bg-red-50', iconBg: 'bg-red-600' },
  ];

  const secondaryStats: { label: string; value: number; icon: typeof Users; bg: string; iconBg: string; page: Page['name'] }[] = [
    { label: t('users'), value: users.length, icon: Users, bg: 'bg-violet-50', iconBg: 'bg-violet-600', page: 'users' },
    { label: t('locations'), value: locations.length, icon: MapPin, bg: 'bg-amber-50', iconBg: 'bg-amber-600', page: 'locations' },
    { label: t('accessories'), value: accessories.length, icon: Package, bg: 'bg-cyan-50', iconBg: 'bg-cyan-600', page: 'accessories' },
    { label: t('consumables'), value: consumables.length, icon: PackageCheck, bg: 'bg-orange-50', iconBg: 'bg-orange-600', page: 'consumables' },
    { label: t('licenses'), value: licenses.length, icon: KeyRound, bg: 'bg-teal-50', iconBg: 'bg-teal-600', page: 'licenses' },
    { label: t('categories'), value: categories.length, icon: Boxes, bg: 'bg-slate-50', iconBg: 'bg-slate-600', page: 'categories' },
  ];

  // Category distribution
  const categoryDist = categories
    .filter((c) => c.type === 'asset')
    .map((c) => ({
      name: c.name,
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${s.iconBg} text-white`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Category distribution */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{t('assetsByCategory')}</h3>
          {categoryDist.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t('noDataYet')}</p>
          ) : (
            <div className="space-y-3">
              {categoryDist.map((c) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-28 shrink-0">{c.name}</span>
                  <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden">
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

        {/* Total value */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{t('inventoryValue')}</h3>
          <p className="text-3xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">{t('totalPurchaseCost')}</p>
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('avgCostPerAsset')}</span>
              <span className="font-medium text-gray-900">${assets.length ? (totalValue / assets.length).toFixed(0) : 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('pendingSetup')}</span>
              <span className="font-medium text-amber-600">{pending}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('needsRepair')}</span>
              <span className="font-medium text-red-600">{broken}</span>
            </div>
          </div>
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
            <button onClick={() => navigate({ name: 'assets' })} className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
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
                  <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
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
                    {h.assigned_to ? `${h.assigned_to.first_name} ${h.assigned_to.last_name || ''}` : t('system')}
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
