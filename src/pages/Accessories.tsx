import { useEffect, useMemo, useState } from 'react';
import { supabase, type Accessory, type Category, type CheckoutHistory, type Location, type Manufacturer, type UserRecord } from '@/lib/supabase';
import { Plus, Edit3, Trash2, Package, Search, AlertTriangle, Boxes, CheckCircle2 } from 'lucide-react';
import { Button, Modal, Input, Select, PageHeader, EmptyState, ConfirmDialog, TablePagination } from '@/components/ui';
import { IssueMeta, IssueStockModal } from '@/components/IssueStock';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { notifyCriticalStock } from '@/lib/stockAlerts';
import { fetchStockIssues, issueStock } from '@/lib/stockIssue';
import { getCurrentActor } from '@/lib/checkoutHistory';
import { repairTurkishName } from '@/lib/turkishNames';
import { InventoryFilterBar } from '@/components/InventoryFilterBar';

const DEFAULT_ACCESSORY_CREATOR = 'Bilal Ugurel';

function accessoryCreatorName(name: string | null | undefined) {
  const trimmed = (name || '').trim();
  if (!trimmed) return DEFAULT_ACCESSORY_CREATOR;
  const lower = trimmed.toLocaleLowerCase('tr-TR');
  if (lower === 'sistem' || lower === 'system') return DEFAULT_ACCESSORY_CREATOR;
  return repairTurkishName(trimmed);
}

interface Props {
  accessories: Accessory[];
  categories: Category[];
  manufacturers: Manufacturer[];
  users: UserRecord[];
  locations: Location[];
  onRefresh: () => void;
  canDelete?: boolean;
}

function stockMeta(remaining: number, qty: number, minQty: number) {
  const pct = qty > 0 ? (remaining / qty) * 100 : 0;
  const threshold = Math.max(0, minQty);
  if (remaining <= 0) return { pct, key: 'stockEmpty' as const, chip: 'bg-red-50 text-red-700' };
  if (remaining <= threshold) return { pct, key: 'stockLow' as const, chip: 'bg-red-50 text-red-700' };
  if (pct <= 50) return { pct, key: 'stockMedium' as const, chip: 'bg-amber-50 text-amber-700' };
  return { pct, key: 'stockOk' as const, chip: 'bg-emerald-50 text-emerald-700' };
}

export default function AccessoriesPage({ accessories, categories, manufacturers, users, locations, onRefresh, canDelete = false }: Props) {
  const { t, tn } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Accessory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Accessory | null>(null);
  const [issueTarget, setIssueTarget] = useState<Accessory | null>(null);
  const [issues, setIssues] = useState<CheckoutHistory[]>([]);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const loadIssues = async () => {
    try {
      setIssues(await fetchStockIssues('accessory'));
    } catch {
      setIssues([]);
    }
  };

  useEffect(() => {
    void loadIssues();
  }, []);

  const categoryOptions = useMemo(() => {
    return [...categories]
      .map((c) => ({
        id: c.id,
        label: tn(c.name),
        count: accessories.filter((a) => a.category_id === c.id).length,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'tr'));
  }, [categories, accessories, tn]);

  const totalQty = accessories.reduce((s, a) => s + a.qty, 0);
  const totalRemaining = accessories.reduce((s, a) => s + a.remaining_qty, 0);
  const lowCount = accessories.filter((a) => a.remaining_qty <= (a.min_qty ?? 1)).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return accessories.filter((a) => {
      if (categoryId && a.category_id !== categoryId) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.serial || '').toLowerCase().includes(q) ||
        (a.manufacturer?.name || '').toLowerCase().includes(q) ||
        (a.category?.name || '').toLowerCase().includes(q) ||
        (a.location?.name || '').toLowerCase().includes(q) ||
        (a.created_by_name || '').toLowerCase().includes(q) ||
        tn(a.category?.name).toLowerCase().includes(q) ||
        tn(a.location?.name).toLowerCase().includes(q)
      );
    });
  }, [accessories, search, categoryId, tn]);

  useEffect(() => { setPage(1); }, [search, categoryId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const handleSave = async (data: Record<string, string>) => {
    setSaving(true);
    const qty = Math.max(1, parseInt(String(data.qty), 10) || 1);
    const minQty = Math.max(0, parseInt(String(data.min_qty), 10) || 0);
    if (editing) {
      const remaining = Math.min(qty, Math.max(0, parseInt(String(data.remaining_qty), 10) || 0));
      await supabase.from('accessories').update({
        name: data.name,
        serial: data.serial?.trim() || null,
        manufacturer_id: data.manufacturer_id || null,
        category_id: data.category_id || null,
        location_id: data.location_id || null,
        qty, min_qty: minQty,
        remaining_qty: remaining,
      }).eq('id', editing.id);
    } else {
      const actor = await getCurrentActor();
      const row = {
        name: data.name,
        serial: data.serial?.trim() || null,
        manufacturer_id: data.manufacturer_id || null,
        category_id: data.category_id || null,
        location_id: data.location_id || null,
        qty, remaining_qty: qty, min_qty: minQty,
        created_by_name: actor.name ? repairTurkishName(actor.name) : DEFAULT_ACCESSORY_CREATOR,
        created_by_email: actor.email,
      };
      const { error } = await supabase.from('accessories').insert(row);
      if (error && /created_by_/i.test(error.message)) {
        const { created_by_name: _n, created_by_email: _e, ...legacy } = row;
        await supabase.from('accessories').insert(legacy);
      }
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    onRefresh();
    notifyCriticalStock('scan');
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    await supabase.from('accessories').delete().eq('id', id);
    onRefresh();
  };

  const handleIssue = async (opts: { qty: number; givenTo: string; assignedToId: string | null; note: string }) => {
    if (!issueTarget) return;
    setIssuing(true);
    setIssueError('');
    try {
      await issueStock({
        kind: 'accessory',
        itemId: issueTarget.id,
        remaining: issueTarget.remaining_qty,
        qty: opts.qty,
        givenTo: opts.givenTo,
        assignedToId: opts.assignedToId,
        note: opts.note,
        itemName: issueTarget.name,
        categoryId: issueTarget.category_id,
        manufacturerId: issueTarget.manufacturer_id,
        locationId: issueTarget.location_id,
        serial: issueTarget.serial,
      });
      setIssueTarget(null);
      onRefresh();
      await loadIssues();
      notifyCriticalStock('scan');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'not_enough_stock') setIssueError(t('notEnoughStock'));
      else if (msg === 'given_to_required') setIssueError(t('givenToRequired'));
      else setIssueError(msg);
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('accessories')}
        description={t('accessoriesDesc')}
        action={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" /> {t('addAccessory')}</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-cyan-600 mb-2">
            <Boxes className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('items')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{accessories.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-brand-600 mb-2">
            <Package className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('totalStock')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalQty}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('available')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalRemaining}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('lowStock')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{lowCount}</p>
        </div>
      </div>

      {/* Search + category filter */}
      <InventoryFilterBar
        search={search}
        onSearchChange={setSearch}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        categories={categoryOptions}
        totalCount={accessories.length}
      />

      {accessories.length === 0 ? (
        <EmptyState icon={Package} title={t('noAccessoriesYet')} description={t('addAccessoriesDesc')} action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> {t('addAccessory')}</Button>} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title={t('noResults')} description={t('adjustFilters')} />
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-1 sm:p-2">
          {paged.map((a) => {
            const meta = stockMeta(a.remaining_qty, a.qty, a.min_qty ?? 1);
            const used = Math.max(0, a.qty - a.remaining_qty);
            return (
              <div key={a.id} className="magic-card">
                <div className="magic-card-info">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => { setEditing(a); setShowForm(true); }} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700" title={t('edit')}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {canDelete ? (
                        <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600" title={t('delete')}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <h3 className="magic-card-title mt-2 text-sm truncate capitalize" title={a.name}>{a.name}</h3>
                  <div className="mt-1 flex items-center gap-1.5 min-w-0">
                    <span className={`shrink-0 inline-flex items-center px-1.5 py-px rounded-full text-[10px] font-semibold ${meta.chip}`}>
                      {t(meta.key)}
                    </span>
                    <p className="text-[11px] text-gray-500 truncate">
                      {a.manufacturer?.name || '—'}
                      <span className="mx-1 text-gray-300">·</span>
                      {tn(a.category?.name) || '—'}
                      {a.location?.name ? (
                        <>
                          <span className="mx-1 text-gray-300">·</span>
                          {tn(a.location.name)}
                        </>
                      ) : null}
                    </p>
                  </div>
                  {a.serial ? (
                    <p className="mt-1 text-[11px] text-gray-500 truncate">
                      <span className="text-gray-400">{t('serial')}: </span>
                      <span className="font-mono text-gray-700">{a.serial}</span>
                    </p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-gray-500 truncate" title={a.created_by_email || undefined}>
                    <span className="text-gray-400">{t('addedBy')}: </span>
                    <span className="font-medium text-gray-700">
                      {accessoryCreatorName(a.created_by_name)}
                    </span>
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-1">
                    <div className="rounded-lg bg-slate-50 py-1.5 text-center">
                      <p className="text-[9px] uppercase tracking-wide text-gray-400">{t('inStock')}</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{a.remaining_qty}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-1.5 text-center">
                      <p className="text-[9px] uppercase tracking-wide text-gray-400">{t('used')}</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{used}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-1.5 text-center">
                      <p className="text-[9px] uppercase tracking-wide text-gray-400">{t('quantity')}</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{a.qty}</p>
                    </div>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-3">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, meta.pct)}%`, background: 'linear-gradient(to left, #f7ba2b, #ea5358)' }} />
                  </div>
                  <div className="mt-auto pt-2">
                    <IssueMeta
                      itemName={a.name}
                      issues={issues.filter((h) => h.accessory_id === a.id)}
                      onIssue={() => { setIssueError(''); setIssueTarget(a); }}
                      disabled={a.remaining_qty <= 0}
                    />
                  </div>
                </div>
              </div>
            );
          })}
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

      {showForm && (
        <AccessoryForm
          accessory={editing}
          categories={categories}
          manufacturers={manufacturers}
          locations={locations}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}

      <ConfirmDialog
        open={canDelete && !!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title={t('deleteAccessory')}
        message={t('deleteConfirm', { name: deleteTarget?.name || '' })}
      />

      <IssueStockModal
        open={!!issueTarget}
        kind="accessory"
        itemId={issueTarget?.id || ''}
        itemName={issueTarget?.name || ''}
        remaining={issueTarget?.remaining_qty || 0}
        users={users}
        locations={locations}
        history={issues}
        saving={issuing}
        error={issueError}
        onClose={() => { if (!issuing) setIssueTarget(null); }}
        onIssue={handleIssue}
      />
    </div>
  );
}

function AccessoryForm({ accessory, categories, manufacturers, locations, onClose, onSave, saving }: {
  accessory: Accessory | null;
  categories: Category[];
  manufacturers: Manufacturer[];
  locations: Location[];
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
}) {
  const { t, tn } = useI18n();
  const [form, setForm] = useState({
    name: accessory?.name || '',
    serial: accessory?.serial || '',
    manufacturer_id: accessory?.manufacturer_id || '',
    category_id: accessory?.category_id || '',
    location_id: accessory?.location_id || '',
    qty: accessory ? String(accessory.qty) : '1',
    remaining_qty: accessory ? String(accessory.remaining_qty) : '1',
    min_qty: accessory ? String(accessory.min_qty ?? 1) : '1',
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={accessory ? t('editAccessory') : t('addAccessory')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.name}>{saving ? t('saving') : t('save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={`${t('name')} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('placeholderAccessoryName')} required />
        <Input label={`${t('serial')} (${t('serialOptional')})`} value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} placeholder={t('serialOptional')} />
        <Select label={t('manufacturer')} value={form.manufacturer_id} onChange={(e) => setForm({ ...form, manufacturer_id: e.target.value })}>
          <option value="">{t('none')}</option>
          {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <Select label={t('category')} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
          <option value="">{t('none')}</option>
          {[...categories]
            .sort((a, b) => tn(a.name).localeCompare(tn(b.name), 'tr'))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {tn(c.name)} ({t(c.type as TranslationKey)})
              </option>
            ))}
        </Select>
        <Select label={t('location')} value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
          <option value="">{t('none')}</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{tn(l.name)}</option>)}
        </Select>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t('quantity')} type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          {accessory ? (
            <Input label={t('remaining')} type="number" min="0" value={form.remaining_qty} onChange={(e) => setForm({ ...form, remaining_qty: e.target.value })} />
          ) : (
            <Input label={t('lowStockQty')} type="number" min="0" value={form.min_qty} onChange={(e) => setForm({ ...form, min_qty: e.target.value })} />
          )}
        </div>
        {accessory ? (
          <Input label={t('lowStockQty')} type="number" min="0" value={form.min_qty} onChange={(e) => setForm({ ...form, min_qty: e.target.value })} />
        ) : null}
        <p className="text-xs text-gray-500 -mt-2">{t('lowStockQtyHint')}</p>
      </div>
    </Modal>
  );
}
