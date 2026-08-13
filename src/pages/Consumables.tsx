import { useEffect, useMemo, useState } from 'react';
import { supabase, type Consumable, type Category, type CheckoutHistory, type Location, type Manufacturer, type UserRecord } from '@/lib/supabase';
import { Plus, Edit3, Trash2, PackageCheck, Search, AlertTriangle, Boxes, CheckCircle2 } from 'lucide-react';
import { Button, Modal, Input, Select, PageHeader, EmptyState, ConfirmDialog, TablePagination } from '@/components/ui';
import { IssueMeta, IssueStockModal } from '@/components/IssueStock';
import { useI18n } from '@/lib/i18n';
import { notifyCriticalStock } from '@/lib/stockAlerts';
import { fetchStockIssues, issueStock } from '@/lib/stockIssue';

interface Props {
  consumables: Consumable[];
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

export default function ConsumablesPage({ consumables, categories, manufacturers, users, locations, onRefresh, canDelete = false }: Props) {
  const { t, tn } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Consumable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Consumable | null>(null);
  const [issueTarget, setIssueTarget] = useState<Consumable | null>(null);
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
      setIssues(await fetchStockIssues('consumable'));
    } catch {
      setIssues([]);
    }
  };

  useEffect(() => {
    void loadIssues();
  }, []);

  const categoryOptions = useMemo(() => {
    const typed = categories.filter((c) => c.type === 'consumable');
    const usedIds = new Set(consumables.map((c) => c.category_id).filter(Boolean) as string[]);
    const extras = categories.filter((c) => usedIds.has(c.id) && c.type !== 'consumable');
    return [...typed, ...extras].sort((a, b) => tn(a.name).localeCompare(tn(b.name), 'tr'));
  }, [categories, consumables, tn]);

  const totalQty = consumables.reduce((s, c) => s + c.qty, 0);
  const totalRemaining = consumables.reduce((s, c) => s + c.remaining_qty, 0);
  const lowCount = consumables.filter((c) => c.remaining_qty <= (c.min_qty ?? 1)).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return consumables.filter((c) => {
      if (categoryId && c.category_id !== categoryId) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        tn(c.name).toLowerCase().includes(q) ||
        (c.manufacturer?.name || '').toLowerCase().includes(q) ||
        (c.category?.name || '').toLowerCase().includes(q) ||
        tn(c.category?.name).toLowerCase().includes(q)
      );
    });
  }, [consumables, search, categoryId, tn]);

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
      await supabase.from('consumables').update({
        name: data.name, manufacturer_id: data.manufacturer_id || null,
        category_id: data.category_id || null, qty, min_qty: minQty,
        remaining_qty: remaining,
      }).eq('id', editing.id);
    } else {
      await supabase.from('consumables').insert({
        name: data.name, manufacturer_id: data.manufacturer_id || null,
        category_id: data.category_id || null, qty, remaining_qty: qty, min_qty: minQty,
      });
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    onRefresh();
    notifyCriticalStock('scan');
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    await supabase.from('consumables').delete().eq('id', id);
    onRefresh();
  };

  const handleIssue = async (opts: { qty: number; givenTo: string; assignedToId: string | null; note: string }) => {
    if (!issueTarget) return;
    setIssuing(true);
    setIssueError('');
    try {
      await issueStock({
        kind: 'consumable',
        itemId: issueTarget.id,
        remaining: issueTarget.remaining_qty,
        qty: opts.qty,
        givenTo: opts.givenTo,
        assignedToId: opts.assignedToId,
        note: opts.note,
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
        title={t('consumables')}
        description={t('consumablesDesc')}
        action={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" /> {t('addConsumable')}</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <Boxes className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('items')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{consumables.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-brand-600 mb-2">
            <PackageCheck className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('totalStock')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalQty}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('remaining')}</span>
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

      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchInventory')}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
        {categoryOptions.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1 -mx-1 px-1">
            <button
              type="button"
              onClick={() => setCategoryId('')}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                !categoryId
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300'
              }`}
            >
              {t('allCategories')}
              <span className={`tabular-nums ${!categoryId ? 'text-brand-100' : 'text-gray-400'}`}>{consumables.length}</span>
            </button>
            {categoryOptions.map((c) => {
              const count = consumables.filter((item) => item.category_id === c.id).length;
              const active = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300'
                  }`}
                >
                  <span className="truncate max-w-[10rem]">{tn(c.name)}</span>
                  <span className={`tabular-nums ${active ? 'text-brand-100' : 'text-gray-400'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {consumables.length === 0 ? (
        <EmptyState icon={PackageCheck} title={t('noConsumablesYet')} description={t('addConsumablesDesc')} action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> {t('addConsumable')}</Button>} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title={t('noResults')} description={t('adjustFilters')} />
      ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-1 sm:p-2">
          {paged.map((c) => {
            const meta = stockMeta(c.remaining_qty, c.qty, c.min_qty ?? 1);
            const used = Math.max(0, c.qty - c.remaining_qty);
            return (
              <div key={c.id} className="magic-card">
                <div className="magic-card-info">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                      <PackageCheck className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700" title={t('edit')}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {canDelete ? (
                        <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600" title={t('delete')}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <h3 className="magic-card-title mt-2 text-sm truncate capitalize" title={tn(c.name)}>{tn(c.name)}</h3>
                  <div className="mt-1 flex items-center gap-1.5 min-w-0">
                    <span className={`shrink-0 inline-flex items-center px-1.5 py-px rounded-full text-[10px] font-semibold ${meta.chip}`}>
                      {t(meta.key)}
                    </span>
                    <p className="text-[11px] text-gray-500 truncate">
                      {c.manufacturer?.name || '—'}
                      <span className="mx-1 text-gray-300">·</span>
                      {tn(c.category?.name) || '—'}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1">
                    <div className="rounded-lg bg-slate-50 py-1.5 text-center">
                      <p className="text-[9px] uppercase tracking-wide text-gray-400">{t('remaining')}</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{c.remaining_qty}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-1.5 text-center">
                      <p className="text-[9px] uppercase tracking-wide text-gray-400">{t('used')}</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{used}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-1.5 text-center">
                      <p className="text-[9px] uppercase tracking-wide text-gray-400">{t('quantity')}</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{c.qty}</p>
                    </div>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-3">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, meta.pct)}%`, background: 'linear-gradient(to left, #f7ba2b, #ea5358)' }} />
                  </div>
                  <div className="mt-auto pt-2">
                    <IssueMeta
                      itemName={tn(c.name)}
                      issues={issues.filter((h) => h.consumable_id === c.id)}
                      onIssue={() => { setIssueError(''); setIssueTarget(c); }}
                      disabled={c.remaining_qty <= 0}
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
        <ConsumableForm consumable={editing} categories={categories} manufacturers={manufacturers} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} saving={saving} />
      )}

      <ConfirmDialog
        open={canDelete && !!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title={t('deleteConsumable')}
        message={t('deleteConfirm', { name: deleteTarget?.name || '' })}
      />

      <IssueStockModal
        open={!!issueTarget}
        kind="consumable"
        itemId={issueTarget?.id || ''}
        itemName={issueTarget ? tn(issueTarget.name) : ''}
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

function ConsumableForm({ consumable, categories, manufacturers, onClose, onSave, saving }: {
  consumable: Consumable | null;
  categories: Category[];
  manufacturers: Manufacturer[];
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
}) {
  const { t, tn } = useI18n();
  const [form, setForm] = useState({
    name: consumable?.name || '',
    manufacturer_id: consumable?.manufacturer_id || '',
    category_id: consumable?.category_id || '',
    qty: consumable ? String(consumable.qty) : '1',
    remaining_qty: consumable ? String(consumable.remaining_qty) : '1',
    min_qty: consumable ? String(consumable.min_qty ?? 1) : '1',
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={consumable ? t('editConsumable') : t('addConsumable')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.name}>{saving ? t('saving') : t('save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={`${t('name')} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('placeholderConsumableName')} required />
        <Select label={t('manufacturer')} value={form.manufacturer_id} onChange={(e) => setForm({ ...form, manufacturer_id: e.target.value })}>
          <option value="">{t('none')}</option>
          {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <Select label={t('category')} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
          <option value="">{t('none')}</option>
          {categories.filter((c) => c.type === 'consumable' || c.id === form.category_id).map((c) => <option key={c.id} value={c.id}>{tn(c.name)}</option>)}
        </Select>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t('quantity')} type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          {consumable ? (
            <Input label={t('remaining')} type="number" min="0" value={form.remaining_qty} onChange={(e) => setForm({ ...form, remaining_qty: e.target.value })} />
          ) : (
            <Input label={t('lowStockQty')} type="number" min="0" value={form.min_qty} onChange={(e) => setForm({ ...form, min_qty: e.target.value })} />
          )}
        </div>
        {consumable ? (
          <Input label={t('lowStockQty')} type="number" min="0" value={form.min_qty} onChange={(e) => setForm({ ...form, min_qty: e.target.value })} />
        ) : null}
        <p className="text-xs text-gray-500 -mt-2">{t('lowStockQtyHint')}</p>
      </div>
    </Modal>
  );
}
