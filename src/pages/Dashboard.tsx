import { type Asset, type UserRecord, type Location, type Category, type Accessory, type Consumable, type License } from '@/lib/supabase';
import { Boxes, CheckCircle2, TrendingUp, Users, MapPin, Package, KeyRound, PackageCheck, ArrowRight, Activity, AlertTriangle } from 'lucide-react';
import { type Page } from '@/App';
import { StatusBadge } from '@/components/ui';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useEffect, useMemo, useState } from 'react';
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

  const ready = assets.filter((a) => a.status === 'ready').reduce((s, a) => s + Math.max(0, Number(a.remaining_qty ?? a.qty) || 1), 0);
  const deployed = assets.filter((a) => a.status === 'deployed').reduce((s, a) => s + Math.max(1, Number(a.qty) || 1), 0);
  const totalAssetQty = assets.reduce((s, a) => s + Math.max(1, Number(a.qty) || 1), 0);

  const canSeeAccessories = canAccessPage(appRole, 'accessories');
  const canSeeConsumables = canAccessPage(appRole, 'consumables');

  const criticalStock = useMemo(() => {
    const items: {
      id: string;
      kind: 'accessory' | 'consumable';
      name: string;
      remaining: number;
      minQty: number;
      page: 'accessories' | 'consumables';
    }[] = [];

    if (canSeeAccessories) {
      for (const a of accessories) {
        const minQty = a.min_qty ?? 1;
        if (a.remaining_qty <= minQty) {
          items.push({
            id: a.id,
            kind: 'accessory',
            name: a.name,
            remaining: a.remaining_qty,
            minQty,
            page: 'accessories',
          });
        }
      }
    }
    if (canSeeConsumables) {
      for (const c of consumables) {
        const minQty = c.min_qty ?? 1;
        if (c.remaining_qty <= minQty) {
          items.push({
            id: c.id,
            kind: 'consumable',
            name: c.name,
            remaining: c.remaining_qty,
            minQty,
            page: 'consumables',
          });
        }
      }
    }

    return items.sort((a, b) => a.remaining - b.remaining || a.name.localeCompare(b.name, 'tr'));
  }, [accessories, consumables, canSeeAccessories, canSeeConsumables]);

  const showCriticalPanel = canSeeAccessories || canSeeConsumables;

  const stats: {
    label: string;
    value: number;
    icon: typeof Boxes;
    iconBg: string;
    page: Page['name'];
  }[] = [
    { label: t('totalAssets'), value: totalAssetQty, icon: Boxes, iconBg: 'bg-brand-600', page: 'categories' },
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

      {showCriticalPanel ? (
        <div
          className={`mb-6 rounded-xl border p-4 sm:p-5 ${
            criticalStock.length > 0
              ? 'bg-red-50/80 border-red-200'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                  criticalStock.length > 0 ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {criticalStock.length > 0 ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900">{t('dashboardCriticalStock')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('dashboardCriticalStockDesc')}</p>
              </div>
            </div>
            {criticalStock.length > 0 ? (
              <span className="inline-flex self-start items-center rounded-lg bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-1">
                {t('stockAlertCriticalCount', { count: criticalStock.length })}
              </span>
            ) : null}
          </div>

          {criticalStock.length === 0 ? (
            <p className="text-sm text-gray-500 pl-0 sm:pl-[3.25rem]">{t('dashboardCriticalStockOk')}</p>
          ) : (
            <ul className="space-y-2 sm:pl-[3.25rem]">
              {criticalStock.slice(0, 8).map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => navigate({ name: item.page })}
                    className="w-full flex items-center gap-3 rounded-lg bg-white/90 border border-red-100 px-3 py-2.5 text-left hover:border-red-300 hover:shadow-sm transition-all"
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                      item.kind === 'accessory' ? 'bg-cyan-50 text-cyan-700' : 'bg-orange-50 text-orange-700'
                    }`}>
                      {item.kind === 'accessory' ? <Package className="w-4 h-4" /> : <PackageCheck className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.kind === 'accessory' ? t('accessory') : t('consumable')}
                        <span className="mx-1 text-gray-300">·</span>
                        {t('minThreshold')}: {item.minQty}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${item.remaining <= 0 ? 'text-red-700' : 'text-amber-700'}`}>
                        {t('remainingShort', { remaining: item.remaining })}
                      </p>
                      <p className="text-[11px] text-gray-400">{item.remaining <= 0 ? t('stockEmpty') : t('stockLow')}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 hidden sm:block" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {criticalStock.length > 8 ? (
            <div className="mt-3 flex flex-wrap gap-2 sm:pl-[3.25rem]">
              {canSeeAccessories ? (
                <button
                  type="button"
                  onClick={() => navigate({ name: 'accessories' })}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                >
                  {t('accessories')} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null}
              {canSeeConsumables ? (
                <button
                  type="button"
                  onClick={() => navigate({ name: 'consumables' })}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                >
                  {t('consumables')} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

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
