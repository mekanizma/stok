import { useState } from 'react';
import { supabase, type UserRecord, type Location, type Asset } from '@/lib/supabase';
import { Plus, Edit3, Trash2, Mail, Phone, Briefcase, Boxes } from 'lucide-react';
import { Button, Modal, Input, Select, PageHeader, EmptyState, ConfirmDialog, Avatar } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

interface Props {
  users: UserRecord[];
  locations: Location[];
  assets: Asset[];
  onRefresh: () => void;
}

export default function UsersPage({ users, locations, assets, onRefresh }: Props) {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: Partial<UserRecord>) => {
    setSaving(true);
    if (editing) {
      await supabase.from('users').update({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        job_title: data.job_title,
        employee_num: data.employee_num,
        location_id: data.location_id || null,
      }).eq('id', editing.id);
    } else {
      await supabase.from('users').insert({
        first_name: data.first_name,
        last_name: data.last_name || null,
        email: data.email || null,
        phone: data.phone || null,
        job_title: data.job_title || null,
        employee_num: data.employee_num || null,
        location_id: data.location_id || null,
      });
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('users').delete().eq('id', id);
    onRefresh();
  };

  const getAssetCount = (userId: string) => assets.filter((a) => a.assigned_to_id === userId).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('users')}
        description={`${users.length} ${t('usersInSystem')}`}
        action={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" /> {t('addUser')}</Button>}
      />

      {users.length === 0 ? (
        <EmptyState icon={Briefcase} title={t('noUsersYet')} description={t('addUsersToAssign')} action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> {t('addUser')}</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <Avatar name={`${u.first_name} ${u.last_name || ''}`} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{u.first_name} {u.last_name}</h3>
                  <p className="text-xs text-gray-500 truncate">{u.job_title || t('employee')}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(u); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                {u.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{u.email}</span></div>}
                {u.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{u.phone}</span></div>}
                {u.employee_num && <div className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 shrink-0" /> <span>{u.employee_num}</span></div>}
                {u.location && <div className="flex items-center gap-2"><span className="truncate">{u.location.name}</span></div>}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Boxes className="w-3.5 h-3.5" />
                  <span className="font-medium text-gray-700">{getAssetCount(u.id)}</span> {t('assetsAssigned')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <UserForm user={editing} locations={locations} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} saving={saving} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title={t('deleteUser')}
        message={`"${deleteTarget?.first_name} ${deleteTarget?.last_name}" ${t('deleteUserMsgEnd')}`}
      />
    </div>
  );
}

function UserForm({ user, locations, onClose, onSave, saving }: {
  user: UserRecord | null;
  locations: Location[];
  onClose: () => void;
  onSave: (data: Partial<UserRecord>) => void;
  saving: boolean;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    job_title: user?.job_title || '',
    employee_num: user?.employee_num || '',
    location_id: user?.location_id || '',
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={user ? t('editUser') : t('addUser')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.first_name}>{saving ? t('saving') : t('save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label={`${t('firstName')} *`} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
          <Input label={t('lastName')} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>
        <Input label={t('email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('employeeNum')} value={form.employee_num} onChange={(e) => setForm({ ...form, employee_num: e.target.value })} />
        </div>
        <Input label={t('jobTitle')} value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
        <Select label={t('location')} value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
          <option value="">{t('none')}</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
      </div>
    </Modal>
  );
}
