import { useEffect, useMemo, useState } from 'react';
import { type Asset, type Category, type Manufacturer, type Location } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Boxes, Trash2, Edit3, Monitor, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { Button, Modal, Input, Select, Textarea, PageHeader, EmptyState, ConfirmDialog, TablePagination } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { getAssetInventoryName } from '@/lib/assetAssignee';
import { insertCheckoutHistory } from '@/lib/checkoutHistory';
import { repairTurkishName } from '@/lib/turkishNames';

interface Props {
  assets: Asset[];
  loading: boolean;
  categories: Category[];
  manufacturers: Manufacturer[];
  locations: Location[];
  onRefresh: () => void;
  canDelete?: boolean;
}

export default function AssetsPage({
  assets,
  loading,
  categories,
  manufacturers,
  locations,
  onRefresh,
  canDelete = false,
}: Props) {
  const { t, tn, lang } = useI18n();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [issueTarget, setIssueTarget] = useState<Asset | null>(null);
  const [issuePerson, setIssuePerson] = useState('');
  const [issueLocationId, setIssueLocationId] = useState('');
  const [issueNote, setIssueNote] = useState('');
  const [issueError, setIssueError] = useState('');
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const readyAssets = useMemo(
    () => assets.filter((a) => a.status === 'ready'),
    [assets],
  );
  const deployedCount = assets.filter((a) => a.status === 'deployed').length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return readyAssets;
    return readyAssets.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      a.asset_tag.toLowerCase().includes(q) ||
      (a.serial || '').toLowerCase().includes(q) ||
      (a.model || '').toLowerCase().includes(q) ||
      (a.manufacturer?.name || '').toLowerCase().includes(q) ||
      tn(a.category?.name).toLowerCase().includes(q),
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
    if (editing) {
      await supabase.from('assets').update({
        name: data.name,
        serial: data.serial || null,
        model: data.model || null,
        manufacturer_id: data.manufacturer_id || null,
        category_id: data.category_id || null,
        default_location_id: data.default_location_id || null,
        notes: data.notes || null,
      }).eq('id', editing.id);
    } else {
      const tag = data.asset_tag?.trim() || `AST-${Date.now().toString(36).toUpperCase()}`;
      await supabase.from('assets').insert({
        asset_tag: tag,
        name: data.name.trim(),
        serial: data.serial?.trim() || null,
        model: data.model?.trim() || null,
        manufacturer_id: data.manufacturer_id || null,
        category_id: data.category_id || null,
        default_location_id: data.default_location_id || null,
        status: 'ready',
        notes: data.notes?.trim() || null,
      });
    }
    setSaving(false);
    setShowAdd(false);
    setEditing(null);
    onRefresh();
  };

  const openIssue = (asset: Asset) => {
    setIssueTarget(asset);
    setIssuePerson('');
    setIssueLocationId('');
    setIssueNote('');
    setIssueError('');
  };

  const handleIssue = async () => {
    if (!issueTarget) return;
    const person = issuePerson.trim();
    if (!person) {
      setIssueError(t('givenToRequired'));
      return;
    }
    setIssuing(true);
    setIssueError('');
    try {
      const locationName = locations.find((l) => l.id === issueLocationId)?.name || '';
      const givenTo = [locationName, person].filter(Boolean).join(' — ');
      const { error: updErr } = await supabase.from('assets').update({
        status: 'deployed',
        assigned_to_id: null,
        assignee_name: givenTo,
        assignee_email: null,
      }).eq('id', issueTarget.id);
      if (updErr) throw updErr;

      const noteParts = [t('checkedOutFromAssets'), issueNote.trim()].filter(Boolean);
      const { error: histErr } = await insertCheckoutHistory({
        asset_id: issueTarget.id,
        action: 'checkout',
        qty: 1,
        given_to: givenTo,
        note: noteParts.join(' — ') || null,
      });
      if (histErr) throw histErr;

      setIssueTarget(null);
      onRefresh();
    } catch (e) {
      setIssueError(e instanceof Error ? e.message : String(e));
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

  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('assets')}
        description={t('assetsInventoryDesc')}
        action={<Button onClick={() => { setEditing(null); setShowAdd(true); }}><Plus className="w-4 h-4" /> {t('addAsset')}</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-brand-600 mb-2">
            <Boxes className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('available')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{readyAssets.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('items')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{assets.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <ClipboardCheck className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('deployed')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{deployedCount}</p>
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
          action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> {t('addAsset')}</Button>}
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
                  </div>
                  <div className="mt-auto pt-2">
                    <button
                      type="button"
                      onClick={() => openIssue(a)}
                      className="w-full h-8 rounded-lg text-xs font-medium bg-brand-600 text-white hover:bg-brand-700"
                    >
                      {t('issueStock')}
                    </button>
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
          asset={editing}
          categories={categories}
          manufacturers={manufacturers}
          locations={locations}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}

      <Modal
        open={!!issueTarget}
        onClose={() => setIssueTarget(null)}
        title={t('issueStock')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIssueTarget(null)} disabled={issuing}>{t('cancel')}</Button>
            <Button onClick={handleIssue} disabled={issuing || !issuePerson.trim()} className="w-full sm:w-auto">
              {issuing ? t('saving') : t('issueConfirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <p className="text-sm font-semibold text-gray-900 truncate">{issueTarget ? getAssetInventoryName(issueTarget) : ''}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{issueTarget?.serial || '—'}</p>
            <p className="text-xs text-gray-400 mt-1">{t('issueGoesToDeployed')}</p>
          </div>
          <Select
            label={t('issueLocation')}
            value={issueLocationId}
            onChange={(e) => setIssueLocationId(e.target.value)}
          >
            <option value="">{t('selectOptional')}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{tn(l.name)}</option>
            ))}
          </Select>
          <Input
            label={`${t('issuePerson')} *`}
            value={issuePerson}
            onChange={(e) => setIssuePerson(e.target.value)}
            placeholder={t('issuePersonPlaceholder')}
            autoComplete="name"
          />
          <Textarea
            label={t('notes')}
            rows={2}
            value={issueNote}
            onChange={(e) => setIssueNote(e.target.value)}
            placeholder={t('issueNotePlaceholder')}
          />
          {issueError ? <p className="text-sm text-red-600">{issueError}</p> : null}
          {issuePerson.trim() ? (
            <p className="text-xs text-gray-500">
              {t('issuedAt')}: {new Date().toLocaleString(locale)} → {repairTurkishName([locations.find((l) => l.id === issueLocationId)?.name, issuePerson.trim()].filter(Boolean).join(' — '))}
            </p>
          ) : null}
        </div>
      </Modal>

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

function AssetForm({ asset, categories, manufacturers, locations, onClose, onSave, saving }: {
  asset: Asset | null;
  categories: Category[];
  manufacturers: Manufacturer[];
  locations: Location[];
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
}) {
  const { t, tn } = useI18n();
  const [form, setForm] = useState({
    name: asset?.name || '',
    asset_tag: asset?.asset_tag || '',
    serial: asset?.serial || '',
    model: asset?.model || '',
    manufacturer_id: asset?.manufacturer_id || '',
    category_id: asset?.category_id || '',
    default_location_id: asset?.default_location_id || '',
    notes: asset?.notes || '',
  });

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
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.name.trim()}>{saving ? t('saving') : t('save')}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={`${t('name')} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('placeholderAssetName')} required />
          {!asset && <Input label={t('assetTag')} value={form.asset_tag} onChange={(e) => setForm({ ...form, asset_tag: e.target.value })} placeholder={t('autoGenerated')} />}
          <Input label={`${t('serial')} *`} value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} placeholder="SN…" required={!asset} />
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
        </div>
        <Textarea label={t('notes')} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </form>
    </Modal>
  );
}
