import { useState } from 'react';
import { supabase, type Location, type Asset, type UserRecord } from '@/lib/supabase';
import { Plus, Edit3, Trash2, MapPin, Boxes, Users } from 'lucide-react';
import { Button, Modal, Input, PageHeader, EmptyState, ConfirmDialog } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

interface Props {
  locations: Location[];
  assets: Asset[];
  users: UserRecord[];
  onRefresh: () => void;
}

export default function LocationsPage({ locations, assets, users, onRefresh }: Props) {
  const { t, tn } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: Partial<Location>) => {
    setSaving(true);
    if (editing) {
      await supabase.from('locations').update({
        name: data.name, address: data.address, city: data.city, country: data.country,
      }).eq('id', editing.id);
    } else {
      await supabase.from('locations').insert({
        name: data.name, address: data.address || null, city: data.city || null, country: data.country || null,
      });
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('locations').delete().eq('id', id);
    onRefresh();
  };

  const getAssetCount = (locId: string) => assets.filter((a) => a.default_location_id === locId).length;
  const getUserCount = (locId: string) => users.filter((u) => u.location_id === locId).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('locations')}
        description={`${locations.length} ${t('locationsCount')}`}
        action={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" /> {t('addLocation')}</Button>}
      />

      {locations.length === 0 ? (
        <EmptyState icon={MapPin} title={t('noLocationsYet')} description={t('addLocationsToTrack')} action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> {t('addLocation')}</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((l) => (
            <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 text-amber-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(l); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(l)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">{tn(l.name)}</h3>
              <p className="text-sm text-gray-500 mb-3">
                {[l.address, l.city, tn(l.country)].filter(Boolean).join(', ') || t('none')}
              </p>
              <div className="flex gap-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Boxes className="w-3.5 h-3.5" /> <span className="font-medium text-gray-700">{getAssetCount(l.id)}</span> {t('assets')}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users className="w-3.5 h-3.5" /> <span className="font-medium text-gray-700">{getUserCount(l.id)}</span> {t('users')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <LocationForm location={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} saving={saving} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title={t('deleteLocation')}
        message={t('deleteConfirm', { name: tn(deleteTarget?.name) })}
      />
    </div>
  );
}

function LocationForm({ location, onClose, onSave, saving }: {
  location: Location | null;
  onClose: () => void;
  onSave: (data: Partial<Location>) => void;
  saving: boolean;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: location?.name || '',
    address: location?.address || '',
    city: location?.city || '',
    country: location?.country || '',
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={location ? t('editLocation') : t('addLocation')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.name}>{saving ? t('saving') : t('save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={`${t('name')} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('placeholderLocationName')} required />
        <Input label={t('address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('city')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label={t('country')} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
