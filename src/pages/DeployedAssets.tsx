import { useState, useMemo, useRef } from 'react';
import { supabase, type Asset, type Category, type Manufacturer, type Location } from '@/lib/supabase';
import { Search, Boxes, ArrowRightLeft, Plus, Upload, Download, FileSpreadsheet, Edit3, Trash2 } from 'lucide-react';
import { type Page } from '@/App';
import { StatusBadge, Button, Modal, Input, Select, Textarea, PageHeader, EmptyState, Avatar, ConfirmDialog, TablePagination, type PageSize } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { getAssetAssignee, isAssetDeployed, getAssetDisplayName } from '@/lib/assetAssignee';
import {
  parseZimmetFile,
  isZimmetImportFile,
  withZimmetDefaults,
  ZIMMET_CSV_TEMPLATE,
  type ZimmetImportRow,
} from '@/lib/zimmetImport';
import { repairTurkishName } from '@/lib/turkishNames';
import { insertCheckoutHistory } from '@/lib/checkoutHistory';

interface Props {
  assets: Asset[];
  categories: Category[];
  manufacturers: Manufacturer[];
  locations: Location[];
  loading: boolean;
  canEdit?: boolean;
  canManage?: boolean;
  navigate: (p: Page) => void;
  onCheckin: (asset: Asset) => void;
  onRefresh: () => void;
}

async function resolveOrCreateCategory(name: string, existing: Category[]): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const found = existing.find((c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.type === 'asset');
  if (found) return found.id;
  const { data } = await supabase.from('categories').insert({ name: trimmed, type: 'asset', color: 'slate' }).select('id').single();
  if (data?.id) existing.push({ ...data, name: trimmed, type: 'asset', color: 'slate', created_at: new Date().toISOString() } as Category);
  return data?.id || null;
}

async function resolveOrCreateManufacturer(name: string, existing: Manufacturer[]): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const found = existing.find((m) => m.name.toLowerCase() === trimmed.toLowerCase());
  if (found) return found.id;
  const { data } = await supabase.from('manufacturers').insert({ name: trimmed }).select('id').single();
  if (data?.id) existing.push({ id: data.id, name: trimmed, url: null, support_url: null, created_at: new Date().toISOString() });
  return data?.id || null;
}

async function resolveOrCreateLocation(name: string, existing: Location[]): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const found = existing.find((l) => l.name.toLowerCase() === trimmed.toLowerCase());
  if (found) return found.id;
  const { data } = await supabase.from('locations').insert({ name: trimmed }).select('id').single();
  if (data?.id) existing.push({ id: data.id, name: trimmed, address: null, city: null, country: null, created_at: new Date().toISOString() });
  return data?.id || null;
}

export default function DeployedAssetsPage({
  assets, categories, manufacturers, locations, loading, canEdit = false, canManage = false, navigate, onCheckin, onRefresh,
}: Props) {
  const { t, tn } = useI18n();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Asset | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [checkinTarget, setCheckinTarget] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [pendingRows, setPendingRows] = useState<ZimmetImportRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const deployed = useMemo(() => {
    return assets
      .filter(isAssetDeployed)
      .filter((a) => {
        const q = search.toLowerCase();
        if (!q) return true;
        const assignee = getAssetAssignee(a);
        const locationName = a.default_location?.name
          || locations.find((l) => l.id === a.default_location_id)?.name
          || '';
        return (
          a.name.toLowerCase().includes(q) ||
          a.asset_tag.toLowerCase().includes(q) ||
          (a.serial || '').toLowerCase().includes(q) ||
          (assignee?.name || '').toLowerCase().includes(q) ||
          (assignee?.email || '').toLowerCase().includes(q) ||
          (a.category?.name || '').toLowerCase().includes(q) ||
          locationName.toLowerCase().includes(q)
        );
      });
  }, [assets, search, locations]);

  const totalPages = Math.max(1, Math.ceil(deployed.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedDeployed = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return deployed.slice(start, start + pageSize);
  }, [deployed, safePage, pageSize]);

  const createDeployedAsset = async (data: {
    name?: string;
    asset_tag?: string;
    serial?: string;
    model?: string;
    manufacturer_id?: string | null;
    category_id?: string | null;
    default_location_id?: string | null;
    assignee_name?: string;
    email?: string;
    notes?: string;
  }) => {
    const tag = data.asset_tag?.trim() || `AST-${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    const assigneeName = repairTurkishName(data.assignee_name) || t('unknownAssignee');
    const assigneeEmail = (data.email || '').trim().toLowerCase();
    const assetName = repairTurkishName(data.name) || assigneeName;

    const { data: createdAsset, error: assetError } = await supabase
      .from('assets')
      .insert({
        asset_tag: tag,
        name: assetName,
        serial: (data.serial || '').trim() || null,
        model: data.model?.trim() || null,
        manufacturer_id: data.manufacturer_id || null,
        category_id: data.category_id || null,
        default_location_id: data.default_location_id || null,
        assigned_to_id: null,
        assignee_name: assigneeName,
        assignee_email: assigneeEmail || null,
        status: 'deployed',
        notes: data.notes?.trim() || null,
      })
      .select('id')
      .single();

    if (assetError || !createdAsset?.id) {
      throw new Error(assetError?.message || t('saveFailed'));
    }

    await insertCheckoutHistory({
      asset_id: createdAsset.id,
      assigned_to_id: null,
      action: 'checkout',
      note: `${t('checkedOutFromAssets')} — ${assigneeName}${assigneeEmail ? ` (${assigneeEmail})` : ''}`,
    });
  };

  const handleAddCheckout = async (data: Record<string, string>) => {
    if (!canManage) return;
    const hasSomething = Object.values(data).some((v) => String(v || '').trim());
    if (!hasSomething) return;
    setSaving(true);
    setAddError('');
    try {
      await createDeployedAsset({
        name: data.name,
        asset_tag: data.asset_tag,
        serial: data.serial,
        model: data.model,
        manufacturer_id: data.manufacturer_id || null,
        category_id: data.category_id || null,
        default_location_id: data.default_location_id || null,
        assignee_name: data.assignee_name,
        email: data.email,
        notes: data.notes,
      });
      setShowAdd(false);
      onRefresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditCheckout = async (data: Record<string, string>) => {
    if (!canEdit || !editTarget) return;
    const hasSomething = Object.values(data).some((v) => String(v || '').trim());
    if (!hasSomething) return;
    setSaving(true);
    setEditError('');
    try {
      const assigneeName = repairTurkishName(data.assignee_name) || t('unknownAssignee');
      const assigneeEmail = (data.email || '').trim().toLowerCase();
      const assetName = repairTurkishName(data.name) || assigneeName;
      const tag = data.asset_tag?.trim() || editTarget.asset_tag;

      const { error } = await supabase
        .from('assets')
        .update({
          asset_tag: tag,
          name: assetName,
          serial: (data.serial || '').trim() || null,
          model: data.model?.trim() || null,
          manufacturer_id: data.manufacturer_id || null,
          category_id: data.category_id || null,
          default_location_id: data.default_location_id || null,
          assigned_to_id: null,
          assignee_name: assigneeName,
          assignee_email: assigneeEmail || null,
          status: 'deployed',
          notes: data.notes?.trim() || null,
        })
        .eq('id', editTarget.id);

      if (error) throw new Error(error.message || t('saveFailed'));

      await insertCheckoutHistory({
        asset_id: editTarget.id,
        assigned_to_id: null,
        action: 'audit',
        note: `${t('editCheckout')} — ${assigneeName}${assigneeEmail ? ` (${assigneeEmail})` : ''}`,
      });

      setEditTarget(null);
      onRefresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelected = async (file: File | null) => {
    setImportError('');
    setImportResult('');
    setPendingRows([]);
    setImportFileName('');
    if (!file) return;
    if (!isZimmetImportFile(file.name)) {
      setImportError(t('importUnsupported'));
      return;
    }
    setImportFileName(file.name);
    const { rows, errors } = await parseZimmetFile(file);
    if (errors.includes('unsupported')) {
      setImportError(t('importUnsupported'));
      return;
    }
    if (errors.includes('empty')) {
      setImportError(t('importEmpty'));
      return;
    }
    if (errors.includes('no_data') || !rows.length) {
      setImportError(t('importNoData'));
      return;
    }
    setPendingRows(rows);
  };

  const handleImport = async () => {
    if (!canManage) return;
    if (!pendingRows.length) {
      setImportError(t('importNoFile'));
      return;
    }
    setImporting(true);
    setImportError('');
    setImportResult('');

    const cats = [...categories];
    const mans = [...manufacturers];
    const locs = [...locations];
    let ok = 0;
    let fail = 0;
    const rowErrors: string[] = [];

    for (const raw of pendingRows) {
      const row = withZimmetDefaults(raw, {
        unnamedAsset: t('unnamedAsset'),
        unknownPerson: t('unknownAssignee'),
      });
      try {
        const category_id = await resolveOrCreateCategory(row.category, cats);
        const manufacturer_id = await resolveOrCreateManufacturer(row.manufacturer, mans);
        const default_location_id = await resolveOrCreateLocation(row.location, locs);
        await createDeployedAsset({
          name: row.name,
          asset_tag: row.asset_tag,
          serial: row.serial,
          model: row.model,
          category_id,
          manufacturer_id,
          default_location_id,
          assignee_name: row.assignee_name,
          email: row.email,
          notes: row.notes,
        });
        ok++;
      } catch (err) {
        fail++;
        rowErrors.push(t('importRowError', {
          row: row.rowNumber,
          msg: err instanceof Error ? err.message : t('saveFailed'),
        }));
      }
    }

    setImporting(false);
    if (ok > 0 && fail === 0) {
      setImportResult(t('importSuccess', { count: ok }));
    } else if (ok > 0) {
      setImportResult(t('importPartial', { ok, fail }));
      setImportError(rowErrors.slice(0, 5).join('\n'));
    } else {
      setImportError(rowErrors.slice(0, 5).join('\n') || t('saveFailed'));
    }
    if (ok > 0) {
      setPendingRows([]);
      onRefresh();
    }
  };

  const handleDeleteCheckout = async () => {
    if (!canManage || !deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeleting(true);
    const { error } = await supabase.from('assets').delete().eq('id', targetId);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) return;
    onRefresh();
  };

  const downloadTemplate = () => {
    const blob = new Blob([ZIMMET_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zimmet-ornek.csv';
    a.click();
    URL.revokeObjectURL(url);
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
        title={t('deployedAssets')}
        description={t('deployedAssetsDesc')}
        action={
          canManage ? (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => { setShowImport(true); setImportError(''); setImportResult(''); setPendingRows([]); setImportFileName(''); }}>
                <Upload className="w-4 h-4" /> {t('importCsv')}
              </Button>
              <Button onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" /> {t('addCheckout')}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
        />
      </div>

      {deployed.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={t('noDeployedAssets')}
          description={t('noDeployedAssetsDesc')}
          action={canManage ? <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> {t('addCheckout')}</Button> : undefined}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('asset')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('assetTag')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">{t('givenBy')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t('category')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t('location')}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('status')}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedDeployed.map((a) => {
                  const assignee = getAssetAssignee(a);
                  const locationName = a.default_location?.name
                    || locations.find((l) => l.id === a.default_location_id)?.name
                    || '';
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {assignee ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (canEdit) {
                                setEditError('');
                                setEditTarget(a);
                              } else {
                                navigate({ name: 'asset-detail', id: a.id });
                              }
                            }}
                            className="flex items-center gap-2.5 text-left group max-w-full"
                            title={canEdit ? t('editCheckout') : t('viewDetails')}
                          >
                            <Avatar name={assignee.name} size="sm" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors truncate">
                                {assignee.name}
                              </p>
                              {assignee.email && (
                                <p className="text-xs text-brand-600 truncate">{assignee.email}</p>
                              )}
                              {assignee.jobTitle && (
                                <p className="text-xs text-gray-400 truncate">{tn(assignee.jobTitle)}</p>
                              )}
                            </div>
                          </button>
                        ) : canEdit ? (
                          <button
                            type="button"
                            onClick={() => { setEditError(''); setEditTarget(a); }}
                            className="text-sm text-gray-400 hover:text-brand-600"
                            title={t('editCheckout')}
                          >
                            —
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => navigate({ name: 'asset-detail', id: a.id })} className="text-left group">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors truncate">{getAssetDisplayName(a)}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {[a.model, a.serial].filter(Boolean).join(' · ') || '—'}
                          </p>
                          <span className="inline-flex mt-1 text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {a.asset_tag}
                          </span>
                          <p className="mt-1 text-xs text-gray-500 truncate lg:hidden">
                            {[tn(a.category?.name), tn(locationName)].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={t('admin')} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{t('admin')}</p>
                            <p className="text-xs text-gray-400 truncate">admin@stoktakip.com</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-gray-600">{tn(a.category?.name) || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-gray-600">{tn(locationName) || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => { setEditError(''); setEditTarget(a); }}
                              title={t('editCheckout')}
                              className="p-1.5 rounded-lg hover:bg-brand-50 text-gray-500 hover:text-brand-600 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          ) : null}
                          {canManage ? (
                            <button onClick={() => setCheckinTarget(a)} title={t('checkIn')} className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 transition-colors">
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          ) : null}
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(a)}
                              title={t('delete')}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={safePage}
            pageSize={pageSize}
            total={deployed.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </div>
      )}

      {canManage && showAdd && (
        <CheckoutForm
          categories={categories}
          manufacturers={manufacturers}
          locations={locations}
          saving={saving}
          error={addError}
          onClose={() => { setShowAdd(false); setAddError(''); }}
          onSave={handleAddCheckout}
        />
      )}

      {canEdit && editTarget && (
        <CheckoutForm
          asset={editTarget}
          categories={categories}
          manufacturers={manufacturers}
          locations={locations}
          saving={saving}
          error={editError}
          onClose={() => { setEditTarget(null); setEditError(''); }}
          onSave={handleEditCheckout}
        />
      )}

      <Modal
        open={canManage && showImport}
        onClose={() => { if (!importing) setShowImport(false); }}
        title={t('importCsvTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowImport(false)} disabled={importing}>{t('cancel')}</Button>
            <Button onClick={handleImport} disabled={importing || pendingRows.length === 0}>
              {importing ? t('importing') : t('importStart')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('importCsvHint')}</p>
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">{t('importCsvColumns')}</p>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full sm:w-auto">
            <Download className="w-4 h-4" /> {t('downloadCsvTemplate')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.docx,.xml,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/xml,application/xml"
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-slate-50 px-4 py-8 text-sm text-gray-600 hover:border-brand-300 hover:bg-brand-50/40 transition-colors"
          >
            <FileSpreadsheet className="w-8 h-8 text-brand-600" />
            <span className="font-medium">{t('selectCsvFile')}</span>
            {importFileName ? <span className="text-xs text-gray-500 truncate max-w-full px-2">{importFileName}</span> : null}
            {pendingRows.length > 0 ? (
              <span className="text-xs font-semibold text-emerald-700">{t('importRowsReady', { count: pendingRows.length })}</span>
            ) : null}
          </button>
          {importResult ? <p className="text-sm text-emerald-600 whitespace-pre-wrap">{importResult}</p> : null}
          {importError ? <p className="text-sm text-red-600 whitespace-pre-wrap">{importError}</p> : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={canManage && !!checkinTarget}
        onClose={() => setCheckinTarget(null)}
        onConfirm={() => {
          if (!canManage || !checkinTarget) return;
          onCheckin(checkinTarget);
          setCheckinTarget(null);
          navigate({ name: 'checked-in-assets' });
        }}
        title={t('checkInConfirmTitle')}
        message={t('checkInConfirmMsg', { name: getAssetDisplayName(checkinTarget) })}
        confirmLabel={t('checkIn')}
        confirmVariant="primary"
      />

      <ConfirmDialog
        open={canManage && !!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        onConfirm={() => { void handleDeleteCheckout(); }}
        title={t('deleteCheckout')}
        message={t('deleteCheckoutConfirm', { name: getAssetDisplayName(deleteTarget) })}
        confirmLabel={deleting ? t('saving') : t('delete')}
        confirmVariant="danger"
      />
    </div>
  );
}

function CheckoutForm({ asset, categories, manufacturers, locations, onClose, onSave, saving, error }: {
  asset?: Asset | null;
  categories: Category[];
  manufacturers: Manufacturer[];
  locations: Location[];
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
  saving: boolean;
  error?: string;
}) {
  const { t, tn } = useI18n();
  const fillFileRef = useRef<HTMLInputElement>(null);
  const [fillMsg, setFillMsg] = useState('');
  const [fillErr, setFillErr] = useState('');
  const assignee = getAssetAssignee(asset);
  const [form, setForm] = useState({
    name: asset?.name || '',
    asset_tag: asset?.asset_tag || '',
    serial: asset?.serial || '',
    model: asset?.model || '',
    manufacturer_id: asset?.manufacturer_id || '',
    category_id: asset?.category_id || '',
    default_location_id: asset?.default_location_id || '',
    assignee_name: assignee?.name || asset?.assignee_name || '',
    email: assignee?.email || asset?.assignee_email || '',
    notes: asset?.notes || '',
  });

  const isEdit = Boolean(asset);
  const canSave = Object.values(form).some((v) => String(v || '').trim().length > 0);

  const applyRowToForm = (row: ZimmetImportRow) => {
    const catId = row.category
      ? (categories.find((c) => c.name.toLowerCase() === row.category.toLowerCase() && c.type === 'asset')?.id || '')
      : '';
    const manId = row.manufacturer
      ? (manufacturers.find((m) => m.name.toLowerCase() === row.manufacturer.toLowerCase())?.id || '')
      : '';
    const locId = row.location
      ? (locations.find((l) => l.name.toLowerCase() === row.location.toLowerCase())?.id || '')
      : '';

    setForm((prev) => ({
      ...prev,
      ...(row.assignee_name ? { assignee_name: row.assignee_name } : {}),
      ...(row.email ? { email: row.email } : {}),
      ...(row.name ? { name: row.name } : {}),
      ...(row.asset_tag ? { asset_tag: row.asset_tag } : {}),
      ...(row.serial ? { serial: row.serial } : {}),
      ...(row.model ? { model: row.model } : {}),
      ...(catId ? { category_id: catId } : {}),
      ...(manId ? { manufacturer_id: manId } : {}),
      ...(locId ? { default_location_id: locId } : {}),
      ...(row.notes ? { notes: row.notes } : {}),
    }));
  };

  const handleFillFile = async (file: File | null) => {
    setFillMsg('');
    setFillErr('');
    if (!file) return;
    if (!isZimmetImportFile(file.name)) {
      setFillErr(t('importUnsupported'));
      return;
    }
    const { rows, errors } = await parseZimmetFile(file);
    if (errors.includes('unsupported')) {
      setFillErr(t('importUnsupported'));
      return;
    }
    if (errors.includes('empty') || !rows.length) {
      setFillErr(t('importNoData'));
      return;
    }
    applyRowToForm(rows[0]);
    setFillMsg(t('formFilledFromFile'));
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isEdit ? t('editCheckout') : t('addCheckout')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !canSave}>
            {saving ? t('saving') : t('save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-gray-200 bg-slate-50 px-3 py-3">
          <input
            ref={fillFileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.docx,.xml,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/xml,application/xml"
            className="hidden"
            onChange={(e) => {
              void handleFillFile(e.target.files?.[0] || null);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => fillFileRef.current?.click()}
          >
            <Upload className="w-4 h-4" /> {t('fillFromFile')}
          </Button>
          <p className="mt-2 text-xs text-gray-500">{t('importCsvHint')}</p>
          {fillMsg ? <p className="mt-1 text-xs text-emerald-600">{fillMsg}</p> : null}
          {fillErr ? <p className="mt-1 text-xs text-red-600">{fillErr}</p> : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('fullName')}
            value={form.assignee_name}
            onChange={(e) => setForm({ ...form, assignee_name: e.target.value })}
            placeholder={t('placeholderPersonName')}
          />
          <Input
            label={t('email')}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={t('placeholderEmail')}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t('name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('placeholderAssetName')} />
          <Input label={t('assetTag')} value={form.asset_tag} onChange={(e) => setForm({ ...form, asset_tag: e.target.value })} placeholder={t('autoGenerated')} />
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
        </div>
        <Textarea label={t('notes')} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
}
