import { useState } from 'react';
import { supabase, type License, type Category, type Manufacturer } from '@/lib/supabase';
import { Plus, Edit3, Trash2, KeyRound, Calendar, DollarSign } from 'lucide-react';
import { Button, Modal, Input, Select, PageHeader, EmptyState, ConfirmDialog } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

interface Props {
  licenses: License[];
  categories: Category[];
  manufacturers: Manufacturer[];
  onRefresh: () => void;
}

export default function LicensesPage({ licenses, categories, manufacturers, onRefresh }: Props) {
  const { t, lang } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<License | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: Record<string, string>) => {
    setSaving(true);
    const seats = parseInt(String(data.seats)) || 1;
    if (editing) {
      await supabase.from('licenses').update({
        name: data.name, serial: data.serial, manufacturer_id: data.manufacturer_id || null,
        category_id: data.category_id || null, seats, remaining_seats: Math.min(editing.remaining_seats, seats),
        expiration_date: data.expiration_date || null, purchase_cost: data.purchase_cost ? parseFloat(String(data.purchase_cost)) : null,
      }).eq('id', editing.id);
    } else {
      await supabase.from('licenses').insert({
        name: data.name, serial: data.serial || null, manufacturer_id: data.manufacturer_id || null,
        category_id: data.category_id || null, seats, remaining_seats: seats,
        expiration_date: data.expiration_date || null, purchase_cost: data.purchase_cost ? parseFloat(String(data.purchase_cost)) : null,
      });
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('licenses').delete().eq('id', id);
    onRefresh();
  };

  const isExpired = (date: string | null) => date && new Date(date) < new Date();
  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const d = new Date(date);
    const diff = d.getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('licenses')}
        description={`${licenses.length} ${t('softwareLicenses')}`}
        action={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" /> {t('addLicense')}</Button>}
      />

      {licenses.length === 0 ? (
        <EmptyState icon={KeyRound} title={t('noLicensesYet')} description={t('addLicensesDesc')} action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> {t('addLicense')}</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {licenses.map((l) => {
            const pct = l.seats > 0 ? (l.remaining_seats / l.seats) * 100 : 0;
            const barColor = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
            return (
              <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50 text-teal-600">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(l); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteTarget(l)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{l.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{l.manufacturer?.name || '—'} · {l.category?.name || '—'}</p>

                {l.serial && <p className="text-xs font-mono text-gray-400 mb-2 truncate">SN: {l.serial}</p>}

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{t('seats')}</span>
                    <span className="font-medium text-gray-700">{l.remaining_seats} / {l.seats} {t('available').toLowerCase()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100 text-xs">
                  {l.expiration_date && (
                    <div className={`flex items-center gap-1 ${isExpired(l.expiration_date) ? 'text-red-600' : isExpiringSoon(l.expiration_date) ? 'text-amber-600' : 'text-gray-500'}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      {isExpired(l.expiration_date) ? t('expired') : isExpiringSoon(l.expiration_date) ? t('expiringSoon') : new Date(l.expiration_date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                    </div>
                  )}
                  {l.purchase_cost && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <DollarSign className="w-3.5 h-3.5" /> ${l.purchase_cost.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <LicenseForm license={editing} categories={categories} manufacturers={manufacturers} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} saving={saving} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title={t('deleteLicense')}
        message={`"${deleteTarget?.name}" ${t('deleteConfirm')}`}
      />
    </div>
  );
}

function LicenseForm({ license, categories, manufacturers, onClose, onSave, saving }: {
  license: License | null;
  categories: Category[];
  manufacturers: Manufacturer[];
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: license?.name || '',
    serial: license?.serial || '',
    manufacturer_id: license?.manufacturer_id || '',
    category_id: license?.category_id || '',
    seats: license ? String(license.seats) : '1',
    expiration_date: license?.expiration_date || '',
    purchase_cost: license?.purchase_cost ? String(license.purchase_cost) : '',
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={license ? t('editLicense') : t('addLicense')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.name}>{saving ? t('saving') : t('save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={`${t('name')} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Microsoft 365 Business" required />
        <Input label={t('serial')} value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} />
        <div className="grid grid-cols-2 gap-4">
          <Select label={t('manufacturer')} value={form.manufacturer_id} onChange={(e) => setForm({ ...form, manufacturer_id: e.target.value })}>
            <option value="">{t('none')}</option>
            {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Select label={t('category')} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">{t('none')}</option>
            {categories.filter((c) => c.type === 'license').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('seats')} type="number" min="1" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
          <Input label={t('expirationDate')} type="date" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} />
        </div>
        <Input label={`${t('purchaseCost')} ($)`} type="number" value={form.purchase_cost} onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })} />
      </div>
    </Modal>
  );
}
