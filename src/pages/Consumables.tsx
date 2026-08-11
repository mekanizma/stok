import { useMemo, useState } from 'react';
import { supabase, type Consumable, type Category, type Manufacturer } from '@/lib/supabase';
import { Plus, Edit3, Trash2, PackageCheck, Search, AlertTriangle, Boxes, CheckCircle2 } from 'lucide-react';
import { Button, Modal, Input, Select, PageHeader, EmptyState, ConfirmDialog } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { notifyCriticalStock } from '@/lib/stockAlerts';

interface Props {
  consumables: Consumable[];
  categories: Category[];
  manufacturers: Manufacturer[];
  onRefresh: () => void;
}

function stockMeta(remaining: number, qty: number, minQty: number) {
  const pct = qty > 0 ? (remaining / qty) * 100 : 0;
  const threshold = Math.max(0, minQty);
  if (remaining <= 0) return { pct, key: 'stockEmpty' as const, chip: 'bg-red-100 text-red-700', bar: 'bg-red-500', ring: 'ring-red-100' };
  if (remaining <= threshold) return { pct, key: 'stockLow' as const, chip: 'bg-red-50 text-red-700', bar: 'bg-red-500', ring: 'ring-red-100' };
  if (pct <= 50) return { pct, key: 'stockMedium' as const, chip: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500', ring: 'ring-amber-100' };
  return { pct, key: 'stockOk' as const, chip: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500', ring: 'ring-emerald-100' };
}

export default function ConsumablesPage({ consumables, categories, manufacturers, onRefresh }: Props) {
  const { t, tn } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Consumable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Consumable | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const totalQty = consumables.reduce((s, c) => s + c.qty, 0);
  const totalRemaining = consumables.reduce((s, c) => s + c.remaining_qty, 0);
  const lowCount = consumables.filter((c) => c.remaining_qty <= (c.min_qty ?? 1)).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return consumables;
    return consumables.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      tn(c.name).toLowerCase().includes(q) ||
      (c.manufacturer?.name || '').toLowerCase().includes(q) ||
      (c.category?.name || '').toLowerCase().includes(q) ||
      tn(c.category?.name).toLowerCase().includes(q),
    );
  }, [consumables, search, tn]);

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
    await supabase.from('consumables').delete().eq('id', id);
    onRefresh();
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

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchInventory')}
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        />
      </div>

      {consumables.length === 0 ? (
        <EmptyState icon={PackageCheck} title={t('noConsumablesYet')} description={t('addConsumablesDesc')} action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> {t('addConsumable')}</Button>} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title={t('noResults')} description={t('adjustFilters')} />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const meta = stockMeta(c.remaining_qty, c.qty, c.min_qty ?? 1);
            const used = Math.max(0, c.qty - c.remaining_qty);
            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow ring-1 ${meta.ring}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                      <PackageCheck className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-900 truncate">{tn(c.name)}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.chip}`}>
                          {t(meta.key)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {c.manufacturer?.name || '—'}
                        <span className="mx-1.5 text-gray-300">·</span>
                        {tn(c.category?.name) || '—'}
                        <span className="mx-1.5 text-gray-300">·</span>
                        {t('lowStockQty')}: {c.min_qty ?? 1}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-4 sm:w-[280px] shrink-0">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{t('remaining')}</p>
                      <p className="text-lg font-bold text-gray-900">{c.remaining_qty}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{t('used')}</p>
                      <p className="text-lg font-bold text-gray-900">{used}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{t('quantity')}</p>
                      <p className="text-lg font-bold text-gray-900">{c.qty}</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-1 shrink-0 self-end sm:self-center">
                    <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors" title={t('edit')}>
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(c)} className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors" title={t('delete')}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${meta.bar} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, meta.pct)}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ConsumableForm consumable={editing} categories={categories} manufacturers={manufacturers} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} saving={saving} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title={t('deleteConsumable')}
        message={t('deleteConfirm', { name: deleteTarget?.name || '' })}
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
          {categories.filter((c) => c.type === 'consumable').map((c) => <option key={c.id} value={c.id}>{tn(c.name)}</option>)}
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
