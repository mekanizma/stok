import { useState, useMemo } from 'react';
import { type Asset, type Category, type Manufacturer, type Location, type UserRecord, type AssetStatus } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Boxes, ArrowRightLeft, Trash2, Edit3, Filter, ChevronDown, Tag } from 'lucide-react';
import { type Page } from '@/App';
import { StatusBadge, STATUS_OPTIONS, Button, Modal, Input, Select, Textarea, PageHeader, EmptyState, ConfirmDialog, Avatar } from '@/components/ui';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { getAssetDisplayName } from '@/lib/assetAssignee';
import { insertCheckoutHistory } from '@/lib/checkoutHistory';

interface Props {
  assets: Asset[];
  loading: boolean;
  categories: Category[];
  manufacturers: Manufacturer[];
  locations: Location[];
  users: UserRecord[];
  onRefresh: () => void;
  navigate: (p: Page) => void;
  globalSearch: string;
}

export default function AssetsPage({ assets, loading, categories, manufacturers, locations, users, onRefresh, navigate, globalSearch }: Props) {
  const { t, tn } = useI18n();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [checkoutTarget, setCheckoutTarget] = useState<Asset | null>(null);
  const [checkoutUser, setCheckoutUser] = useState('');
  const [saving, setSaving] = useState(false);

  const effectiveSearch = globalSearch || search;

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const q = effectiveSearch.toLowerCase();
      const matchSearch = !q ||
        a.name.toLowerCase().includes(q) ||
        a.asset_tag.toLowerCase().includes(q) ||
        (a.serial || '').toLowerCase().includes(q) ||
        (a.model || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      const matchCategory = categoryFilter === 'all' || a.category_id === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [assets, effectiveSearch, statusFilter, categoryFilter]);

  const handleSave = async (data: Record<string, string>) => {
    setSaving(true);
    if (editing) {
      await supabase.from('assets').update({
        name: data.name,
        serial: data.serial,
        model: data.model,
        manufacturer_id: data.manufacturer_id,
        category_id: data.category_id,
        default_location_id: data.default_location_id,
        status: data.status,
        purchase_date: data.purchase_date,
        purchase_cost: data.purchase_cost,
        warranty_months: data.warranty_months,
        notes: data.notes,
      }).eq('id', editing.id);
    } else {
      const tag = data.asset_tag || `AST-${String(assets.length + 1).padStart(4, '0')}`;
      await supabase.from('assets').insert({
        asset_tag: tag,
        name: data.name,
        serial: data.serial || null,
        model: data.model || null,
        manufacturer_id: data.manufacturer_id || null,
        category_id: data.category_id || null,
        default_location_id: data.default_location_id || null,
        status: data.status || 'ready',
        purchase_date: data.purchase_date || null,
        purchase_cost: data.purchase_cost ? parseFloat(String(data.purchase_cost)) : null,
        warranty_months: data.warranty_months ? parseInt(String(data.warranty_months)) : null,
        notes: data.notes || null,
      });
    }
    setSaving(false);
    setShowAdd(false);
    setEditing(null);
    onRefresh();
  };

  const handleCheckout = async () => {
    if (!checkoutTarget || !checkoutUser) return;
    await supabase.from('assets').update({
      assigned_to_id: checkoutUser,
      status: 'deployed',
    }).eq('id', checkoutTarget.id);
    await insertCheckoutHistory({
      asset_id: checkoutTarget.id,
      assigned_to_id: checkoutUser,
      action: 'checkout',
      note: t('checkedOutFromAssets'),
    });
    setCheckoutTarget(null);
    setCheckoutUser('');
    onRefresh();
  };

  const handleCheckin = async (asset: Asset) => {
    await insertCheckoutHistory({
      asset_id: asset.id,
      assigned_to_id: asset.assigned_to_id,
      action: 'checkin',
      note: t('checkedIn'),
    });
    await supabase.from('assets').update({
      assigned_to_id: null,
      status: 'ready',
    }).eq('id', asset.id);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('assets').delete().eq('id', id);
    onRefresh();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-10 w-full bg-gray-200 rounded" />
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 w-full bg-gray-200 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('assets')}
        description={`${filtered.length} ${t('ofAssets')} ${assets.length} ${t('assetsCount')}`}
        action={<Button onClick={() => { setEditing(null); setShowAdd(true); }}><Plus className="w-4 h-4" /> {t('addAsset')}</Button>}
      />

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="w-4 h-4" /> {t('filters')}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4 animate-fade-in">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AssetStatus | 'all')} className="flex-1">
            <option value="all">{t('allStatuses')}</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t(s as TranslationKey)}</option>)}
          </Select>
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="flex-1">
            <option value="all">{t('allCategories')}</option>
            {categories.filter((c) => c.type === 'asset').map((c) => <option key={c.id} value={c.id}>{tn(c.name)}</option>)}
          </Select>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={t('noAssetsFound')}
          description={assets.length === 0 ? t('addFirstAsset') : t('adjustFilters')}
          action={assets.length === 0 ? <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> {t('addAsset')}</Button> : undefined}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('assets')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">{t('assetTag')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t('category')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t('assignedTo')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('status')}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => navigate({ name: 'asset-detail', id: a.id })} className="flex items-center gap-3 text-left group">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-500 shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                          <Boxes className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors truncate">{getAssetDisplayName(a)}</p>
                          <p className="text-xs text-gray-500 truncate">{a.model || a.serial || '—'}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        <Tag className="w-3 h-3" />{a.asset_tag}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{tn(a.category?.name) || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {a.assigned_to ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={`${a.assigned_to.first_name} ${a.assigned_to.last_name || ''}`} size="sm" />
                          <span className="text-sm text-gray-700">{a.assigned_to.first_name} {a.assigned_to.last_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {a.status === 'deployed' && a.assigned_to_id ? (
                          <button onClick={() => handleCheckin(a)} title={t('checkIn')} className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors">
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => { setCheckoutTarget(a); setCheckoutUser(''); }} title={t('checkOut')} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors">
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => { setEditing(a); setShowAdd(true); }} title={t('edit')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(a)} title={t('delete')} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <AssetForm
          asset={editing}
          categories={categories}
          manufacturers={manufacturers}
          locations={locations}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* Checkout Modal */}
      <Modal
        open={!!checkoutTarget}
        onClose={() => setCheckoutTarget(null)}
        title={t('checkOut')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCheckoutTarget(null)}>{t('cancel')}</Button>
            <Button onClick={handleCheckout} disabled={!checkoutUser}>{t('checkOut')}</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 mb-3"><span className="font-medium text-gray-900">{checkoutTarget?.name}</span> {t('assignAssetTo')}</p>
        <Select label={t('assignTo')} value={checkoutUser} onChange={(e) => setCheckoutUser(e.target.value)}>
          <option value="">{t('selectUser')}</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} — {tn(u.job_title) || t('employee')}</option>)}
        </Select>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        title={t('deleteAsset')}
        message={t('deleteAssetConfirm', { name: getAssetDisplayName(deleteTarget) })}
      />
    </div>
  );
}

// ---- Asset Form ----
function AssetForm({ asset, categories, manufacturers, locations, onClose, onSave, saving }: {
  asset: Asset | null;
  categories: Category[];
  manufacturers: Manufacturer[];
  locations: Location[];
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
}) {
  const { t, tn } = useI18n();
  const [form, setForm] = useState({
    name: asset?.name || '',
    asset_tag: asset?.asset_tag || '',
    serial: asset?.serial || '',
    model: asset?.model || '',
    manufacturer_id: asset?.manufacturer_id || '',
    category_id: asset?.category_id || '',
    default_location_id: asset?.default_location_id || '',
    status: asset?.status || 'ready',
    purchase_date: asset?.purchase_date || '',
    purchase_cost: asset?.purchase_cost ? String(asset.purchase_cost) : '',
    warranty_months: asset?.warranty_months ? String(asset.warranty_months) : '',
    notes: asset?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={asset ? t('editAsset') : t('addAsset')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.name}>{saving ? t('saving') : t('save')}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={`${t('name')} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('placeholderAssetName')} required />
          {!asset && <Input label={t('assetTag')} value={form.asset_tag} onChange={(e) => setForm({ ...form, asset_tag: e.target.value })} placeholder={t('autoGenerated')} />}
          <Input label={t('serial')} value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} />
          <Input label={t('model')} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <Select label={t('category')} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">{t('none')}</option>
            {categories.filter((c) => c.type === 'asset').map((c) => <option key={c.id} value={c.id}>{tn(c.name)}</option>)}
          </Select>
          <Select label={t('manufacturer')} value={form.manufacturer_id} onChange={(e) => setForm({ ...form, manufacturer_id: e.target.value })}>
            <option value="">{t('none')}</option>
            {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Select label={t('defaultLocation')} value={form.default_location_id} onChange={(e) => setForm({ ...form, default_location_id: e.target.value })}>
            <option value="">{t('none')}</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{tn(l.name)}</option>)}
          </Select>
          <Select label={t('status')} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AssetStatus })}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t(s as TranslationKey)}</option>)}
          </Select>
          <Input label={t('purchaseDate')} type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
          <Input label={`${t('purchaseCost')} ($)`} type="number" value={form.purchase_cost} onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })} />
          <Input label={t('warrantyMonths')} type="number" value={form.warranty_months} onChange={(e) => setForm({ ...form, warranty_months: e.target.value })} />
        </div>
        <Textarea label={t('notes')} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </form>
    </Modal>
  );
}
