import { useState } from 'react';
import { supabase, type UserRecord, type Location, type Asset } from '@/lib/supabase';
import { Plus, Edit3, Trash2, Mail, Phone, Briefcase, Boxes, Shield } from 'lucide-react';
import { Button, Modal, Input, Select, PageHeader, EmptyState, ConfirmDialog, Avatar } from '@/components/ui';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { ASSIGNABLE_ROLES, type AppRole } from '@/lib/roles';

interface Props {
  users: UserRecord[];
  locations: Location[];
  assets: Asset[];
  onRefresh: () => void;
}

const ROLE_LABEL: Record<AppRole, TranslationKey> = {
  admin: 'roleAdmin',
  hr: 'roleHr',
  it: 'roleIt',
};

const ROLE_DESC: Record<AppRole, TranslationKey> = {
  admin: 'roleAdminDesc',
  hr: 'roleHrDesc',
  it: 'roleItDesc',
};

const ROLE_BADGE: Record<AppRole, string> = {
  admin: 'bg-rose-50 text-rose-700',
  hr: 'bg-violet-50 text-violet-700',
  it: 'bg-cyan-50 text-cyan-700',
};

export default function UsersPage({ users, locations, assets, onRefresh }: Props) {
  const { t, tn } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSave = async (data: Partial<UserRecord> & { app_role?: string }) => {
    setFormError('');
    setSaving(true);

    if (editing) {
      if (!data.app_role || !ASSIGNABLE_ROLES.includes(data.app_role as AppRole)) {
        setFormError(t('roleRequired'));
        setSaving(false);
        return;
      }
      const { error } = await supabase.rpc('update_staff_user', {
        p_user_id: editing.id,
        p_first_name: data.first_name,
        p_last_name: data.last_name || null,
        p_phone: data.phone || null,
        p_job_title: data.job_title || null,
        p_employee_num: data.employee_num || null,
        p_location_id: data.location_id || null,
        p_role: data.app_role,
      });
      setSaving(false);
      if (error) {
        setFormError(error.message);
        return;
      }
    } else {
      if (!data.email?.trim()) {
        setFormError(t('emailRequired'));
        setSaving(false);
        return;
      }
      if (!data.app_role || !ASSIGNABLE_ROLES.includes(data.app_role as AppRole)) {
        setFormError(t('roleRequired'));
        setSaving(false);
        return;
      }
      const { error } = await supabase.rpc('create_staff_user', {
        p_first_name: data.first_name,
        p_last_name: data.last_name || null,
        p_email: data.email,
        p_phone: data.phone || null,
        p_job_title: data.job_title || null,
        p_employee_num: data.employee_num || null,
        p_location_id: data.location_id || null,
        p_role: data.app_role,
      });
      setSaving(false);
      if (error) {
        setFormError(error.message);
        return;
      }
    }

    setShowForm(false);
    setEditing(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.rpc('delete_staff_user', { p_user_id: id });
    onRefresh();
  };

  const getAssetCount = (userId: string) => assets.filter((a) => a.assigned_to_id === userId).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('users')}
        description={`${users.length} ${t('usersInSystem')}`}
        action={<Button onClick={() => { setEditing(null); setFormError(''); setShowForm(true); }}><Plus className="w-4 h-4" /> {t('addUser')}</Button>}
      />

      {users.length === 0 ? (
        <EmptyState icon={Briefcase} title={t('noUsersYet')} description={t('addUsersToAssign')} action={<Button onClick={() => { setFormError(''); setShowForm(true); }}><Plus className="w-4 h-4" /> {t('addUser')}</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <Avatar name={`${u.first_name} ${u.last_name || ''}`} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{u.first_name} {u.last_name}</h3>
                  <p className="text-xs text-gray-500 truncate">{tn(u.job_title) || t('employee')}</p>
                  {u.app_role && (
                    <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      ROLE_BADGE[u.app_role as AppRole] || 'bg-gray-50 text-gray-700'
                    }`}>
                      <Shield className="w-3 h-3" />
                      {t(ROLE_LABEL[u.app_role as AppRole] || 'roleIt')}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(u); setFormError(''); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
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
                {u.location && <div className="flex items-center gap-2"><span className="truncate">{tn(u.location.name)}</span></div>}
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
        <UserForm
          user={editing}
          locations={locations}
          error={formError}
          onClose={() => { setShowForm(false); setEditing(null); setFormError(''); }}
          onSave={handleSave}
          saving={saving}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title={t('deleteUser')}
        message={t('deleteUserConfirm', { name: `${deleteTarget?.first_name || ''} ${deleteTarget?.last_name || ''}`.trim() })}
      />
    </div>
  );
}

function UserForm({ user, locations, onClose, onSave, saving, error }: {
  user: UserRecord | null;
  locations: Location[];
  onClose: () => void;
  onSave: (data: Partial<UserRecord> & { app_role?: string }) => void;
  saving: boolean;
  error?: string;
}) {
  const { t, tn } = useI18n();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    job_title: user?.job_title || '',
    employee_num: user?.employee_num || '',
    location_id: user?.location_id || '',
    app_role: (user?.app_role || '') as '' | AppRole,
  });

  const canSave = Boolean(
    form.first_name.trim() &&
    (user || form.email.trim()) &&
    form.app_role,
  );

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={user ? t('editUser') : t('addUser')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={() => onSave({ ...form, app_role: form.app_role || undefined })} disabled={saving || !canSave}>{saving ? t('saving') : t('save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {!user && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {t('defaultPasswordHint')}
          </p>
        )}
        <Select
          label={`${t('role')} *`}
          value={form.app_role}
          onChange={(e) => setForm({ ...form, app_role: e.target.value as '' | AppRole })}
          required
        >
          <option value="">—</option>
          {ASSIGNABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {t(ROLE_LABEL[role])} — {t(ROLE_DESC[role])}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={`${t('firstName')} *`} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
          <Input label={t('lastName')} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </div>
        <Input
          label={`${t('email')} *`}
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          disabled={!!user}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t('phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('employeeNum')} value={form.employee_num} onChange={(e) => setForm({ ...form, employee_num: e.target.value })} />
        </div>
        <Input label={t('jobTitle')} value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
        <Select label={t('location')} value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
          <option value="">{t('none')}</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{tn(l.name)}</option>)}
        </Select>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
}
