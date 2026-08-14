import { useEffect, useMemo, useState } from 'react';
import { type Asset, type Category, type CheckoutHistory, type Manufacturer, type Location } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Boxes, Trash2, Edit3, Monitor, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { Button, Modal, Input, Select, Textarea, PageHeader, EmptyState, ConfirmDialog, TablePagination } from '@/components/ui';
import { IssueMeta, IssueStockModal } from '@/components/IssueStock';
import { useI18n } from '@/lib/i18n';
import { getAssetInventoryName } from '@/lib/assetAssignee';
import { assetStock, fetchStockIssues, issueAssetStock } from '@/lib/stockIssue';
import { createdByStamp, inventoryCreatorName } from '@/lib/createdBy';

interface Props {
  assets: Asset[];
  loading: boolean;
  categories: Category[];
  manufacturers: Manufacturer[];
  locations: Location[];
  onRefresh: () => void;
  canDelete?: boolean;
  addCode?: string;
}

function scanPrefill(code: string) {
  const value = code.trim();
  if (/^(AST|ACC|DEM)[-_]/i.test(value)) {
    return { asset_tag: value, serial: '' };
  }
  return { asset_tag: '', serial: value };
}

export default function AssetsPage({
  assets,
  loading,
  categories,
  manufacturers,
  locations,
  onRefresh,
  canDelete = false,
  addCode,
}: Props) {
  const { t, tn } = useI18n();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [issueTarget, setIssueTarget] = useState<Asset | null>(null);
  const [issues, setIssues] = useState<CheckoutHistory[]>([]);
  const [issueError, setIssueError] = useState('');
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [page, setPage] = useState(1);
  const [scanPrefillFields, setScanPrefillFields] = useState<{ asset_tag: string; serial: string } | null>(null);
  const pageSize = 12;

  useEffect(() => {
    if (!addCode?.trim()) return;
    setEditing(null);
    setScanPrefillFields(scanPrefill(addCode));
    setShowAdd(true);
  }, [addCode]);

  const loadIssues = async () => {
    try {
      setIssues(await fetchStockIssues('asset'));
    } catch {
      setIssues([]);
    }
  };

  useEffect(() => {
    void loadIssues();
  }, []);

  const readyAssets = useMemo(
    () => assets.filter((a) => a.status === 'ready'),
    [assets],
  );
  const availableQty = readyAssets.reduce((s, a) => s + assetStock(a).remaining, 0);
  const totalQty = assets.reduce((s, a) => s + assetStock(a).qty, 0);
  const deployedQty = assets.filter((a) => a.status === 'deployed').reduce((s, a) => s + assetStock(a).qty, 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return readyAssets;
    return readyAssets.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      a.asset_tag.toLowerCase().includes(q) ||
      (a.serial || '').toLowerCase().includes(q) ||
      (a.model || '').toLowerCase().includes(q) ||
      (a.manufacturer?.name || '').toLowerCase().includes(q) ||
      tn(a.category?.name).toLowerCase().includes(q) ||
      (a.created_by_name || '').toLowerCase().includes(q),
    );
  }, [readyAssets, search, tn]);

  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const handleSave = async (data: Record<string, string>) => {
    setSaving(true);
    setSaveError('');
    const qty = Math.max(1, Math.min(9999, parseInt(String(data.qty), 10) || 1));
    try {
      if (editing) {
        const remaining = Math.min(qty, Math.max(0, parseInt(String(data.remaining_qty), 10) || 0));
        const { error } = await supabase.from('assets').update({
          name: data.name,
          serial: data.serial || null,
          model: data.model || null,
          manufacturer_id: data.manufacturer_id || null,
          category_id: data.category_id || null,
          default_location_id: data.default_location_id || null,
          notes: data.notes || null,
          qty,
          remaining_qty: remaining,
        }).eq('id', editing.id);
        if (error) throw error;
      } else {
        const tag = data.asset_tag?.trim() || `AST-${Date.now().toString(36).toUpperCase()}`;
        const createdBy = await createdByStamp();
        const row = {
          asset_tag: tag,
          name: data.name.trim(),
          serial: data.serial?.trim() || null,
          model: data.model?.trim() || null,
          manufacturer_id: data.manufacturer_id || null,
          category_id: data.category_id || null,
          default_location_id: data.default_location_id || null,
          status: 'ready',
          notes: data.notes?.trim() || null,
          qty,
          remaining_qty: qty,
          min_qty: 1,
          ...createdBy,
        };
        const { error } = await supabase.from('assets').insert(row);
        if (error && /created_by_/i.test(error.message)) {
          const { created_by_name: _n, created_by_email: _e, ...legacy } = row;
          const { error: retryErr } = await supabase.from('assets').insert(legacy);
          if (retryErr) throw retryErr;
        } else if (error) {
          throw error;
        }
      }
      setShowAdd(false);
      setEditing(null);
      setScanPrefillFields(null);
      onRefresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleIssue = async (opts: { qty: number; givenTo: string; assignedToId: string | null; note: string }) => {
    if (!issueTarget) return;
    setIssuing(true);
    setIssueError('');
    try {
      await issueAssetStock({
        asset: issueTarget,
        qty: opts.qty,
        givenTo: opts.givenTo,
        assignedToId: opts.assignedToId,
        note: opts.note,
      });
      setIssueTarget(null);
      onRefresh();
      await loadIssues();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'not_enough_stock') setIssueError(t('notEnoughStock'));
      else if (msg === 'given_to_required') setIssueError(t('givenToRequired'));
      else setIssueError(msg);
    } finally {
      setIssuing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    await supabase.from('assets').delete().eq('id', id);
    onRefresh();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-10 w-full bg-gray-200 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-52 bg-gray-200 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('assets')}
        description={t('assetsInventoryDesc')}
        action={<Button onClick={() => { setEditing(null); setScanPrefillFields(null); setShowAdd(true); }}><Plus className="w-4 h-4" /> {t('addAsset')}</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-brand-600 mb-2">
            <Boxes className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('available')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{availableQty}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('items')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalQty}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <ClipboardCheck className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('deployed')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{deployedQty}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        />
      </div>

      {readyAssets.length === 0 ? (
        <EmptyState
          icon={Monitor}
          title={t('noAssetsYet')}
          description={t('addFirstAsset')}
          action={<Button onClick={() => { setScanPrefillFields(null); setShowAdd(true); }}><Plus className="w-4 h-4" /> {t('addAsset')}</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title={t('noResults')} description={t('adjustFilters')} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-1 sm:p-2">
            {paged.map((a) => (
              <div key={a.id} className="magic-card">
                <div className="magic-card-info">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => { setEditing(a); setShowAdd(true); }} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700" title={t('edit')}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {canDelete ? (
                        <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600" title={t('delete')}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <h3 className="magic-card-title mt-2 text-sm truncate" title={getAssetInventoryName(a)}>{getAssetInventoryName(a)}</h3>
                  <p className="mt-1 text-[11px] text-gray-500 truncate">
                    {a.manufacturer?.name || '—'}
                    <span className="mx-1 text-gray-300">·</span>
                    {tn(a.category?.name) || '—'}
                  </p>
                  <div className="mt-3 space-y-1.5 rounded-lg bg-slate-50 px-2.5 py-2">
                    <p className="text-[11px] text-gray-600">
                      <span className="text-gray-400">{t('serial')}: </span>
                      <span className="font-mono font-medium text-gray-800">{a.serial || '—'}</span>
                    </p>
                    <p className="text-[11px] text-gray-600 truncate">
                      <span className="text-gray-400">{t('model')}: </span>
                      <span className="font-medium text-gray-800">{a.model || '—'}</span>
                    </p>
                    <p className="text-[11px] text-gray-600 truncate">
                      <span className="text-gray-400">{t('assetTag')}: </span>
                      <span className="font-mono text-gray-700">{a.asset_tag}</span>
                    </p>
                    <p className="text-[11px] text-gray-600 truncate" title={a.created_by_email || undefined}>
                      <span className="text-gray-400">{t('addedBy')}: </span>
                      <span className="font-medium text-gray-800">{inventoryCreatorName(a.created_by_name)}</span>
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1">
                    <div className="rounded-lg bg-slate-50 py-1.5 text-center">
                      <p className="text-[9px] uppercase tracking-wide text-gray-400">{t('inStock')}</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{assetStock(a).remaining}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-1.5 text-center">
                      <p className="text-[9px] uppercase tracking-wide text-gray-400">{t('quantity')}</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{assetStock(a).qty}</p>
                    </div>
                  </div>
                  <div className="mt-auto pt-2">
                    <IssueMeta
                      itemName={getAssetInventoryName(a)}
                      issues={issues.filter((h) => h.asset_id === a.id)}
                      onIssue={() => { setIssueError(''); setIssueTarget(a); }}
                      disabled={assetStock(a).remaining <= 0}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filtered.length > pageSize ? (
            <div className="mt-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
              <TablePagination
                page={safePage}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </>
      )}

      {showAdd && (
        <AssetForm
          key={editing?.id || addCode || 'new'}
          asset={editing}
          categories={categories}
          manufacturers={manufacturers}
          locations={locations}
          onClose={() => { setShowAdd(false); setEditing(null); setSaveError(''); setScanPrefillFields(null); }}
          onSave={handleSave}
          saving={saving}
          saveError={saveError}
          prefill={editing ? undefined : scanPrefillFields || undefined}
        />
      )}

      <IssueStockModal
        open={!!issueTarget}
        kind="asset"
        itemId={issueTarget?.id || ''}
        itemName={issueTarget ? getAssetInventoryName(issueTarget) : ''}
        remaining={issueTarget ? assetStock(issueTarget).remaining : 0}
        users={[]}
        locations={locations}
        history={issues}
        saving={issuing}
        error={issueError}
        onClose={() => { if (!issuing) setIssueTarget(null); }}
        onIssue={handleIssue}
      />

      <ConfirmDialog
        open={canDelete && !!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title={t('deleteAsset')}
        message={t('deleteAssetConfirm', { name: getAssetInventoryName(deleteTarget) })}
      />
    </div>
  );
}

function AssetForm({ asset, categories, manufacturers, locations, onClose, onSave, saving, saveError, prefill }: {
  asset: Asset | null;
  categories: Category[];
  manufacturers: Manufacturer[];
  locations: Location[];
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
  saveError?: string;
  prefill?: { asset_tag?: string; serial?: string };
}) {
  const { t, tn } = useI18n();
  const [form, setForm] = useState({
    name: asset?.name || '',
    asset_tag: asset?.asset_tag || prefill?.asset_tag || '',
    serial: asset?.serial || prefill?.serial || '',
    model: asset?.model || '',
    manufacturer_id: asset?.manufacturer_id || '',
    category_id: asset?.category_id || '',
    default_location_id: asset?.default_location_id || '',
    notes: asset?.notes || '',
    qty: asset ? String(asset.qty ?? 1) : '1',
    remaining_qty: asset ? String(asset.remaining_qty ?? 1) : '1',
  });

  const qtyNum = Math.max(1, parseInt(form.qty, 10) || 1);
  const serialRequired = !asset && qtyNum <= 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={asset ? t('editAsset') : t('addAsset')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="w-full sm:w-auto">{saving ? t('saving') : t('save')}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={`${t('name')} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('placeholderAssetName')} required />
          <Input
            label={`${t('quantity')} *`}
            type="number"
            min="1"
            max="9999"
            inputMode="numeric"
            value={form.qty}
            onChange={(e) => setForm({ ...form, qty: e.target.value })}
          />
          {!asset && <Input label={t('assetTag')} value={form.asset_tag} onChange={(e) => setForm({ ...form, asset_tag: e.target.value })} placeholder={t('autoGenerated')} />}
          <Input label={serialRequired ? `${t('serial')} *` : t('serial')} value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} placeholder="SN…" required={serialRequired} />
          {!asset && (prefill?.serial || prefill?.asset_tag) ? (
            <p className="sm:col-span-2 text-xs text-brand-700 -mt-2">{t('scanFilledFromCode')}</p>
          ) : null}
          <Input label={t('model')} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Laptop / Desktop…" />
          <Select label={t('category')} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">{t('none')}</option>
            {categories.filter((c) => c.type === 'asset').map((c) => <option key={c.id} value={c.id}>{tn(c.name)}</option>)}
          </Select>
          <Select label={t('manufacturer')} value={form.manufacturer_id} onChange={(e) => setForm({ ...form, manufacturer_id: e.target.value })}>
            <option value="">{t('none')}</option>
            {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Select label={t('defaultLocation')} value={form.default_location_id} onChange={(e) => setForm({ ...form, default_location_id: e.target.value })}>
            <option value="">{t('none')}</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{tn(l.name)}</option>)}
          </Select>
          {asset ? (
            <Input
              label={t('remaining')}
              type="number"
              min="0"
              inputMode="numeric"
              value={form.remaining_qty}
              onChange={(e) => setForm({ ...form, remaining_qty: e.target.value })}
            />
          ) : null}
        </div>
        <p className="text-xs text-gray-500 -mt-2">{t('addAssetQtyHint')}</p>
        <Textarea label={t('notes')} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
      </form>
    </Modal>
  );
}
