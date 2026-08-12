import { useState } from 'react';
import { supabase, type Category, type Asset } from '@/lib/supabase';
import { Plus, Edit3, Trash2, Tags, Boxes, KeyRound, Package, PackageCheck, Check } from 'lucide-react';
import { Button, Modal, Input, Select, PageHeader, EmptyState, ConfirmDialog } from '@/components/ui';
import { useI18n, type TranslationKey } from '@/lib/i18n';

interface Props {
  categories: Category[];
  assets: Asset[];
  onRefresh: () => void;
  canDelete?: boolean;
}

const TYPE_ICONS: Record<string, typeof Tags> = {
  asset: Boxes, license: KeyRound, accessory: Package, consumable: PackageCheck,
};

const COLOR_STYLES: Record<string, { swatch: string; icon: string }> = {
  blue: { swatch: 'bg-blue-500', icon: 'bg-blue-50 text-blue-600' },
  cyan: { swatch: 'bg-cyan-500', icon: 'bg-cyan-50 text-cyan-600' },
  emerald: { swatch: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-600' },
  amber: { swatch: 'bg-amber-500', icon: 'bg-amber-50 text-amber-600' },
  rose: { swatch: 'bg-rose-500', icon: 'bg-rose-50 text-rose-600' },
  violet: { swatch: 'bg-violet-500', icon: 'bg-violet-50 text-violet-600' },
  teal: { swatch: 'bg-teal-500', icon: 'bg-teal-50 text-teal-600' },
  orange: { swatch: 'bg-orange-500', icon: 'bg-orange-50 text-orange-600' },
  pink: { swatch: 'bg-pink-500', icon: 'bg-pink-50 text-pink-600' },
  slate: { swatch: 'bg-slate-500', icon: 'bg-slate-50 text-slate-600' },
  red: { swatch: 'bg-red-500', icon: 'bg-red-50 text-red-600' },
  indigo: { swatch: 'bg-indigo-500', icon: 'bg-indigo-50 text-indigo-600' },
};

const COLORS = Object.keys(COLOR_STYLES);

export default function CategoriesPage({ categories, assets, onRefresh, canDelete = false }: Props) {
  const { t, tn } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: Partial<Category>) => {
    setSaving(true);
    if (editing) {
      await supabase.from('categories').update({
        name: data.name, type: data.type, color: data.color,
      }).eq('id', editing.id);
    } else {
      await supabase.from('categories').insert({
        name: data.name, type: data.type || 'asset', color: data.color || 'slate',
      });
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    await supabase.from('categories').delete().eq('id', id);
    onRefresh();
  };

  const getCount = (catId: string) => assets.filter((a) => a.category_id === catId).length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('categories')}
        description={`${categories.length} ${t('categoriesCount')}`}
        action={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" /> {t('addCategory')}</Button>}
      />

      {categories.length === 0 ? (
        <EmptyState icon={Tags} title={t('noCategoriesYet')} description={t('addCategoriesToClassify')} action={<Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> {t('addCategory')}</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => {
            const Icon = TYPE_ICONS[c.type] || Tags;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${COLOR_STYLES[c.color]?.icon || COLOR_STYLES.slate.icon}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {canDelete ? (
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{tn(c.name)}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 capitalize">{t(c.type as TranslationKey)}</span>
                  {c.type === 'asset' && <span className="text-xs text-gray-400">· {getCount(c.id)} {t('assets')}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <CategoryForm category={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} saving={saving} />
      )}

      <ConfirmDialog
        open={canDelete && !!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title={t('deleteCategory')}
        message={t('deleteConfirm', { name: tn(deleteTarget?.name) })}
      />
    </div>
  );
}

function CategoryForm({ category, onClose, onSave, saving }: {
  category: Category | null;
  onClose: () => void;
  onSave: (data: Partial<Category>) => void;
  saving: boolean;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: category?.name || '',
    type: category?.type || 'asset',
    color: category?.color || 'blue',
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={category ? t('editCategory') : t('addCategory')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.name}>{saving ? t('saving') : t('save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={`${t('name')} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('placeholderCategoryName')} required />
        <Select label={t('type')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Category['type'] })}>
          <option value="asset">{t('asset')}</option>
          <option value="accessory">{t('accessory')}</option>
          <option value="consumable">{t('consumable')}</option>
          <option value="license">{t('license')}</option>
        </Select>
        <div>
          <label className="block mb-1.5 text-sm font-medium text-gray-700">{t('color')}</label>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {COLORS.map((c) => {
              const selected = form.color === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  aria-label={c}
                  aria-pressed={selected}
                  className={`relative flex items-center justify-center aspect-square min-h-10 rounded-lg ${COLOR_STYLES[c].swatch} ${
                    selected ? 'ring-2 ring-offset-2 ring-gray-800' : 'ring-1 ring-black/10'
                  }`}
                >
                  {selected ? <Check className="w-4 h-4 text-white drop-shadow" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
