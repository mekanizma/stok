import { useState } from 'react';
import { supabase, type Manufacturer, type Asset } from '@/lib/supabase';
import { Plus, Edit3, Trash2, Building2, ExternalLink, LifeBuoy } from 'lucide-react';
import { Button, Modal, Input, PageHeader, EmptyState, ConfirmDialog } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { BilingualNameFields, initialBilingualNames } from '@/components/BilingualNameFields';
import { canonicalEntityName, registerEntityPair } from '@/lib/entityI18n';

interface Props {
  manufacturers: Manufacturer[];
  assets: Asset[];
  onRefresh: () => void;
  canDelete?: boolean;
}

export default function ManufacturersPage({ manufacturers, assets, onRefresh, canDelete = false }: Props) {
  const { t, tn } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Manufacturer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Manufacturer | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: Partial<Manufacturer> & { nameTr?: string; nameEn?: string }) => {
    setSaving(true);
    const pair = registerEntityPair(data.nameTr || data.name || '', data.nameEn || data.name || '');
    const name = canonicalEntityName(pair);
    if (editing) {
      await supabase.from('manufacturers').update({
        name, url: data.url, support_url: data.support_url,
      }).eq('id', editing.id);
    } else {
      await supabase.from('manufacturers').insert({
        name, url: data.url || null, support_url: data.support_url || null,
      });
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    await supabase.from('manufacturers').delete().eq('id', id);
    onRefresh();
  };

  const getCount = (mfgId: string) => assets.filter((a) => a.manufacturer_id === mfgId).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('manufacturers')}
        description={`${manufacturers.length} ${t('manufacturersCount')}`}
        action={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" /> {t('addManufacturer')}</Button>}
      />

      {manufacturers.length === 0 ? (
        <EmptyState icon={Building2} title={t('noManufacturersYet')} description={t('addManufacturersToTrack')} action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> {t('addManufacturer')}</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('name')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">{t('website')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t('supportUrl')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('assets')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {manufacturers.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-500 shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{tn(m.name)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {m.url ? <a href={m.url} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline flex items-center gap-1">{m.url} <ExternalLink className="w-3 h-3" /></a> : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {m.support_url ? <a href={m.support_url} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline flex items-center gap-1">{t('supportUrl')} <LifeBuoy className="w-3 h-3" /></a> : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3"><span className="text-sm text-gray-600">{getCount(m.id)}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing(m); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"><Edit3 className="w-4 h-4" /></button>
                      {canDelete ? (
                        <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ManufacturerForm manufacturer={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} saving={saving} />
      )}

      <ConfirmDialog
        open={canDelete && !!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title={t('deleteManufacturer')}
        message={t('deleteConfirm', { name: tn(deleteTarget?.name) })}
      />
    </div>
  );
}

function ManufacturerForm({ manufacturer, onClose, onSave, saving }: {
  manufacturer: Manufacturer | null;
  onClose: () => void;
  onSave: (data: Partial<Manufacturer> & { nameTr?: string; nameEn?: string }) => void;
  saving: boolean;
}) {
  const { t } = useI18n();
  const initial = initialBilingualNames(manufacturer?.name);
  const [form, setForm] = useState({
    nameTr: initial.nameTr,
    nameEn: initial.nameEn,
    url: manufacturer?.url || '',
    support_url: manufacturer?.support_url || '',
  });

  const canSave = Boolean(form.nameTr.trim() || form.nameEn.trim());

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={manufacturer ? t('editManufacturer') : t('addManufacturer')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !canSave}>{saving ? t('saving') : t('save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <BilingualNameFields
          nameTr={form.nameTr}
          nameEn={form.nameEn}
          onChange={({ nameTr, nameEn }) => setForm({ ...form, nameTr, nameEn })}
        />
        <Input label={t('website')} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder={t('exampleUrl')} />
        <Input label={t('supportUrl')} value={form.support_url} onChange={(e) => setForm({ ...form, support_url: e.target.value })} placeholder={t('exampleUrl')} />
      </div>
    </Modal>
  );
}
