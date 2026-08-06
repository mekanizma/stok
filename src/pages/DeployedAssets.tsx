import { useState, useMemo } from 'react';
import { type Asset, type UserRecord } from '@/lib/supabase';
import { Search, Boxes, ArrowRightLeft } from 'lucide-react';
import { type Page } from '@/App';
import { StatusBadge, Button, Input, PageHeader, EmptyState, Avatar } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

interface Props {
  assets: Asset[];
  users: UserRecord[];
  loading: boolean;
  navigate: (p: Page) => void;
  onCheckin: (asset: Asset) => void;
}

export default function DeployedAssetsPage({ assets, loading, navigate, onCheckin }: Props) {
  const { t, lang } = useI18n();
  const [search, setSearch] = useState('');

  const deployed = useMemo(() => {
    return assets
      .filter((a) => a.status === 'deployed' && a.assigned_to_id)
      .filter((a) => {
        const q = search.toLowerCase();
        if (!q) return true;
        return (
          a.name.toLowerCase().includes(q) ||
          a.asset_tag.toLowerCase().includes(q) ||
          (a.serial || '').toLowerCase().includes(q) ||
          (a.assigned_to?.first_name || '').toLowerCase().includes(q) ||
          (a.assigned_to?.last_name || '').toLowerCase().includes(q)
        );
      });
  }, [assets, search]);

  const formatDate = (date: string) => new Date(date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US');

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-10 w-full bg-gray-200 rounded" />
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 w-full bg-gray-200 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('deployedAssets')}
        description={t('deployedAssetsDesc')}
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        />
      </div>

      {deployed.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={t('noDeployedAssets')}
          description={t('noDeployedAssetsDesc')}
          action={<Button onClick={() => navigate({ name: 'assets' })}>{t('assets')}</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('assets')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">{t('assetTag')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('assignedTo')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t('category')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('status')}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deployed.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => navigate({ name: 'asset-detail', id: a.id })} className="flex items-center gap-3 text-left group">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-500 shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                          <Boxes className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors truncate">{a.name}</p>
                          <p className="text-xs text-gray-500 truncate">{a.model || a.serial || '—'}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {a.asset_tag}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.assigned_to ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={`${a.assigned_to.first_name} ${a.assigned_to.last_name || ''}`} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm text-gray-700 truncate">{a.assigned_to.first_name} {a.assigned_to.last_name}</p>
                            <p className="text-xs text-gray-400 truncate">{a.assigned_to.job_title || t('employee')}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{a.category?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onCheckin(a)} title={t('checkIn')} className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors">
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
