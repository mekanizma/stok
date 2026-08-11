import { useState, useMemo, useEffect } from 'react';
import { supabase, type Asset, type CheckoutHistory } from '@/lib/supabase';
import { Search, PackageCheck, Boxes, ArrowRightLeft } from 'lucide-react';
import { type Page } from '@/App';
import { StatusBadge, Button, Modal, Input, PageHeader, EmptyState, Avatar, TablePagination, type PageSize } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { isAssetDeployed, getAssetDisplayName } from '@/lib/assetAssignee';
import { insertCheckoutHistory } from '@/lib/checkoutHistory';

interface Props {
  assets: Asset[];
  loading: boolean;
  canManage?: boolean;
  navigate: (p: Page) => void;
  onRefresh: () => void;
}

interface ReturnedRow {
  asset: Asset;
  history: CheckoutHistory;
}

export default function CheckedInAssetsPage({ assets, loading, canManage = false, navigate, onRefresh }: Props) {
  const { t, tn, lang } = useI18n();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [history, setHistory] = useState<CheckoutHistory[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [checkoutTarget, setCheckoutTarget] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setHistLoading(true);
      const { data } = await supabase
        .from('checkout_history')
        .select('*, asset:assets(*), assigned_to:users(*)')
        .eq('action', 'checkin')
        .order('created_at', { ascending: false });
      setHistory((data as CheckoutHistory[]) || []);
      setHistLoading(false);
    })();
  }, [assets]);

  const rows = useMemo(() => {
    const byAsset = new Map<string, ReturnedRow>();
    for (const h of history) {
      if (!h.asset_id || byAsset.has(h.asset_id)) continue;
      const asset = assets.find((a) => a.id === h.asset_id) || (h.asset as Asset | undefined);
      if (!asset) continue;
      if (isAssetDeployed(asset)) continue;
      byAsset.set(h.asset_id, { asset, history: h });
    }
    let list = Array.from(byAsset.values());
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(({ asset: a, history: h }) =>
        a.name.toLowerCase().includes(q) ||
        a.asset_tag.toLowerCase().includes(q) ||
        (a.serial || '').toLowerCase().includes(q) ||
        (h.assigned_to?.first_name || '').toLowerCase().includes(q) ||
        (h.assigned_to?.last_name || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [history, assets, search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  const handleCheckout = async (data: { first_name: string; last_name: string; email: string }) => {
    if (!canManage || !checkoutTarget || !data.first_name.trim() || !data.email.trim()) return;
    setSaving(true);

    const assigneeName = `${data.first_name.trim()} ${data.last_name.trim()}`.trim();
    const assigneeEmail = data.email.trim().toLowerCase();

    const { error } = await supabase.from('assets').update({
      assigned_to_id: null,
      assignee_name: assigneeName,
      assignee_email: assigneeEmail,
      status: 'deployed',
    }).eq('id', checkoutTarget.id);

    if (error) {
      setSaving(false);
      return;
    }

    await insertCheckoutHistory({
      asset_id: checkoutTarget.id,
      assigned_to_id: null,
      action: 'checkout',
      note: `${t('checkedOutFromAssets')} — ${assigneeName} (${assigneeEmail})`,
    });

    setSaving(false);
    setCheckoutTarget(null);
    onRefresh();
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US');

  if (loading || histLoading) {
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
        title={t('checkedInAssets')}
        description={t('checkedInAssetsDesc')}
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title={t('noCheckedInAssets')}
          description={t('noCheckedInAssetsDesc')}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('asset')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">{t('assetTag')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('returnedBy')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t('returnedAt')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('status')}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedRows.map(({ asset: a, history: h }) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => navigate({ name: 'asset-detail', id: a.id })} className="flex items-center gap-3 text-left group">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                          <Boxes className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors truncate">{getAssetDisplayName(a)}</p>
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
                      {h.assigned_to ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={`${h.assigned_to.first_name} ${h.assigned_to.last_name || ''}`} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm text-gray-700 truncate">{h.assigned_to.first_name} {h.assigned_to.last_name}</p>
                            <p className="text-xs text-gray-400 truncate">{tn(h.assigned_to.job_title) || t('employee')}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">{t('system')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{formatDate(h.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        {canManage ? (
                          <Button size="sm" onClick={() => setCheckoutTarget(a)}>
                            <ArrowRightLeft className="w-3.5 h-3.5" /> {t('checkOut')}
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={safePage}
            pageSize={pageSize}
            total={rows.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </div>
      )}

      {canManage && checkoutTarget && (
        <ReCheckoutForm
          assetName={getAssetDisplayName(checkoutTarget)}
          saving={saving}
          onClose={() => setCheckoutTarget(null)}
          onSave={handleCheckout}
        />
      )}
    </div>
  );
}

function ReCheckoutForm({ assetName, onClose, onSave, saving }: {
  assetName: string;
  onClose: () => void;
  onSave: (data: { first_name: string; last_name: string; email: string }) => void;
  saving: boolean;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });

  const canSave = Boolean(form.first_name.trim() && form.email.trim());

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t('checkOut')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !canSave}>
            {saving ? t('saving') : t('checkOut')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{assetName}</span> {t('assignAssetTo')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`${t('firstName')} *`}
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            placeholder={t('firstName')}
            required
          />
          <Input
            label={t('lastName')}
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            placeholder={t('lastName')}
          />
        </div>
        <Input
          label={`${t('email')} *`}
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder={t('placeholderEmail')}
          required
        />
      </div>
    </Modal>
  );
}
