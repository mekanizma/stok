import { useState } from 'react';
import { supabase, type Consumable, type Category, type Manufacturer } from '@/lib/supabase';
import { Plus, Edit3, Trash2, PackageCheck } from 'lucide-react';
import { Button, Modal, Input, Select, PageHeader, EmptyState, ConfirmDialog } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

interface Props {
  consumables: Consumable[];
  categories: Category[];
  manufacturers: Manufacturer[];
  onRefresh: () => void;
}

export default function ConsumablesPage({ consumables, categories, manufacturers, onRefresh }: Props) {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Consumable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Consumable | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: Record<string, string>) => {
    setSaving(true);
    const qty = parseInt(String(data.qty)) || 1;
    if (editing) {
      await supabase.from('consumables').update({
        name: data.name, manufacturer_id: data.manufacturer_id || null,
        category_id: data.category_id || null, qty, remaining_qty: Math.min(editing.remaining_qty, qty),
      }).eq('id', editing.id);
    } else {
      await supabase.from('consumables').insert({
        name: data.name, manufacturer_id: data.manufacturer_id || null,
        category_id: data.category_id || null, qty, remaining_qty: qty,
      });
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('consumables').delete().eq('id', id);
    onRefresh();
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('consumables')}
        description={`${consumables.length} ${t('consumableTypes')}`}
        action={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" /> {t('addConsumable')}</Button>}
      />

      {consumables.length === 0 ? (
        <EmptyState icon={PackageCheck} title={t('noConsumablesYet')} description={t('addConsumablesDesc')} action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> {t('addConsumable')}</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {consumables.map((c) => {
            const pct = c.qty > 0 ? (c.remaining_qty / c.qty) * 100 : 0;
            const barColor = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-50 text-orange-600">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{c.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{c.manufacturer?.name || '—'} · {c.category?.name || '—'}</p>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{t('remaining')}</span>
                    <span className="font-medium text-gray-700">{c.remaining_qty} / {c.qty}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
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
        message={`"${deleteTarget?.name}" ${t('deleteConfirm')}`}
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
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: consumable?.name || '',
    manufacturer_id: consumable?.manufacturer_id || '',
    category_id: consumable?.category_id || '',
    qty: consumable ? String(consumable.qty) : '1',
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
        <Input label={`${t('name')} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. USB-C Cable 2m" required />
        <Select label={t('manufacturer')} value={form.manufacturer_id} onChange={(e) => setForm({ ...form, manufacturer_id: e.target.value })}>
          <option value="">{t('none')}</option>
          {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <Select label={t('category')} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
          <option value="">{t('none')}</option>
          {categories.filter((c) => c.type === 'consumable').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input label={t('quantity')} type="number" min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
      </div>
    </Modal>
  );
}
