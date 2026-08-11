import { useState, useEffect } from 'react';
import { supabase, type Asset, type UserRecord, type Location, type CheckoutHistory } from '@/lib/supabase';
import { ArrowLeft, Boxes, Tag, FileText, ArrowRightLeft, Edit3, Trash2, MapPin, User as UserIcon, Building2, Package, Printer } from 'lucide-react';
import { type Page } from '@/App';
import { StatusBadge, Button, Avatar, Modal, Select } from '@/components/ui';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { getAssetTypeImage } from '@/lib/assetImages';
import { getAssetAssignee, isAssetDeployed, getAssetDisplayName } from '@/lib/assetAssignee';
import { insertCheckoutHistory } from '@/lib/checkoutHistory';

interface Props {
  assetId: string;
  navigate: (p: Page) => void;
  onRefresh: () => void;
  users: UserRecord[];
  locations: Location[];
  canManage?: boolean;
}

export default function AssetDetail({ assetId, navigate, onRefresh, users, canManage = false }: Props) {
  const { t, tn, lang } = useI18n();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<CheckoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutUser, setCheckoutUser] = useState('');

  const fetchAsset = async () => {
    const { data } = await supabase
      .from('assets')
      .select('*, manufacturer:manufacturers(*), category:categories(*), default_location:locations(*), assigned_to:users(*, location:locations(*))')
      .eq('id', assetId)
      .maybeSingle();
    setAsset(data as Asset | null);
    setLoading(false);
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('checkout_history')
      .select('*, asset:assets(*), assigned_to:users(*)')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });
    setHistory((data as CheckoutHistory[]) || []);
  };

  useEffect(() => {
    (async () => {
      await Promise.all([fetchAsset(), fetchHistory()]);
    })();
  }, [assetId]);

  const handleCheckout = async () => {
    if (!canManage || !asset || !checkoutUser) return;
    await supabase.from('assets').update({ assigned_to_id: checkoutUser, status: 'deployed' }).eq('id', asset.id);
    await insertCheckoutHistory({
      asset_id: asset.id,
      assigned_to_id: checkoutUser,
      action: 'checkout',
      note: t('checkedOutFromDetail'),
    });
    setShowCheckout(false);
    setCheckoutUser('');
    fetchAsset();
    fetchHistory();
    onRefresh();
  };

  const handleCheckin = async () => {
    if (!canManage || !asset || !isAssetDeployed(asset)) return;
    const assignee = getAssetAssignee(asset);
    await insertCheckoutHistory({
      asset_id: asset.id,
      assigned_to_id: asset.assigned_to_id,
      action: 'checkin',
      note: assignee ? `${t('checkedIn')} — ${assignee.name}${assignee.email ? ` (${assignee.email})` : ''}` : t('checkedIn'),
    });
    await supabase.from('assets').update({
      assigned_to_id: null,
      assignee_name: null,
      assignee_email: null,
      status: 'ready',
    }).eq('id', asset.id);
    fetchAsset();
    fetchHistory();
    onRefresh();
  };

  const handleDelete = async () => {
    if (!canManage || !asset) return;
    await supabase.from('assets').delete().eq('id', asset.id);
    onRefresh();
    navigate({ name: asset?.status === 'deployed' ? 'deployed-assets' : 'checked-in-assets' });
  };

  const formatDateTime = (date: string) => new Date(date).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US');

  const backPage = (): Page =>
    asset?.status === 'deployed' ? { name: 'deployed-assets' } : { name: 'checked-in-assets' };
  const backLabel = asset?.status === 'deployed' ? t('backToDeployed') : t('backToCheckedIn');

  const generatePDF = () => {
    if (!asset) return;
    const docNo = `ZMT-${asset.asset_tag}-${Date.now().toString().slice(-6)}`;
    const today = new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US');
    const assignee = getAssetAssignee(asset);
    const locName = asset.default_location?.name || '—';
    const lastCheckout = history.find((h) => h.action === 'checkout');
    const givenByName = t('admin');
    const receivedByName = assignee?.name
      || (lastCheckout?.assigned_to
        ? `${lastCheckout.assigned_to.first_name} ${lastCheckout.assigned_to.last_name || ''}`.trim()
        : '—');
    const receivedEmail = assignee?.email
      || lastCheckout?.assigned_to?.email
      || '—';
    const receivedTitle = assignee?.jobTitle
      ? (tn(assignee.jobTitle) || '—')
      : (tn(lastCheckout?.assigned_to?.job_title) || '—');

    const rows: [string, string][] = [
      [t('assetTag'), asset.asset_tag],
      [t('name'), getAssetDisplayName(asset)],
      [t('model'), asset.model || '—'],
      [t('serial'), asset.serial || '—'],
      [t('manufacturer'), asset.manufacturer?.name || '—'],
      [t('category'), tn(asset.category?.name) || '—'],
      [t('defaultLocation'), tn(locName === '—' ? null : locName) || '—'],
    ];

    const hasAssignee = Boolean(assignee || lastCheckout?.assigned_to);
    const assigneeRows: [string, string][] = hasAssignee ? [
      [t('fullName'), receivedByName],
      [t('title'), receivedTitle],
      [t('email'), receivedEmail || '—'],
      [t('department'), tn(lastCheckout?.assigned_to?.location?.name || asset.assigned_to?.location?.name) || '—'],
    ] : [];

    const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${t('universityName')} — ${t('deploymentDocument')}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#1f2937; padding:40px; max-width:800px; margin:0 auto; line-height:1.6; }
.header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1e293b; padding-bottom:16px; margin-bottom:24px; }
.header .title-block { text-align:left; }
.header .uni { font-size:20px; font-weight:700; color:#1e293b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
.header .doc-title { font-size:16px; font-weight:600; color:#334155; letter-spacing:0.5px; }
.header .meta { text-align:right; font-size:13px; color:#6b7280; }
.header .meta p { margin-bottom:2px; }
.header .meta .doc-no { font-weight:600; color:#1e293b; }
.section { margin-bottom:24px; }
.section h2 { font-size:14px; text-transform:uppercase; letter-spacing:0.5px; color:#475569; margin-bottom:12px; padding-bottom:6px; border-bottom:1px solid #e5e7eb; }
.info-table { width:100%; border-collapse:collapse; }
.info-table td { padding:8px 12px; font-size:13px; border:1px solid #e5e7eb; }
.info-table td:first-child { background:#f8fafc; font-weight:600; color:#475569; width:35%; }
.info-table td:last-child { color:#1f2937; }
.declaration { background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin-bottom:32px; }
.declaration h2 { border:none; padding:0; margin-bottom:8px; }
.declaration p { font-size:13px; color:#374151; line-height:1.7; text-align:justify; }
.signatures { display:flex; justify-content:space-between; gap:40px; margin-top:20px; }
.sig-box { flex:1; text-align:center; }
.sig-box .sig-label { font-size:13px; font-weight:600; color:#1e293b; margin-bottom:48px; text-transform:uppercase; letter-spacing:0.5px; }
.sig-box .sig-line { border-top:1px solid #1e293b; padding-top:8px; font-size:12px; color:#6b7280; }
.sig-box .sig-line .name { font-weight:600; color:#1f2937; font-size:13px; margin-bottom:2px; }
.footer { margin-top:40px; text-align:center; font-size:11px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:12px; }
@media print { body { padding:20px; } .no-print { display:none; } .print-btn { display:none; } }
.print-btn { position:fixed; bottom:24px; right:24px; background:#1e293b; color:#fff; border:none; padding:12px 24px; border-radius:8px; font-size:14px; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:999; }
.print-btn:hover { background:#334155; }
</style></head><body>
<div class="header">
<div class="title-block">
<div class="uni">${t('universityName')}</div>
<div class="doc-title">${t('deploymentDocument')}</div>
</div>
<div class="meta"><p class="doc-no">${t('documentNo')}: ${docNo}</p><p>${t('date')}: ${today}</p></div>
</div>
<div class="section">
<h2>${t('assetInformation')}</h2>
<table class="info-table">${rows.map(([l,v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join('')}</table>
</div>
${hasAssignee ? `<div class="section"><h2>${t('assignedToInfo')}</h2><table class="info-table">${assigneeRows.map(([l,v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join('')}</table></div>` : ''}
<div class="declaration">
<h2>${t('declaration')}</h2>
<p>${t('declarationText')}</p>
</div>
<div class="signatures">
<div class="sig-box"><div class="sig-label">${t('givenBy')}</div><div class="sig-line"><div class="name">${givenByName}</div>${t('nameSurname')} / ${t('signature')}</div></div>
<div class="sig-box"><div class="sig-label">${t('receivedBy')}</div><div class="sig-line"><div class="name">${receivedByName}</div>${t('nameSurname')} / ${t('signature')}</div></div>
</div>
<div class="footer">${t('universityName')} · ${t('deploymentDocument')} · ${docNo}</div>
<button class="print-btn" onclick="window.print()">${t('printDocument')}</button>
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-gray-200 rounded" />
          <div className="h-48 w-full bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">{t('assetNotFound')}</p>
        <Button className="mt-4" onClick={() => navigate({ name: 'deployed-assets' })}>{t('backToDeployed')}</Button>
      </div>
    );
  }

  const infoItems = [
    { icon: Tag, label: t('assetTag'), value: asset.asset_tag, mono: true },
    { icon: Package, label: t('serial'), value: asset.serial || '—', mono: true },
    { icon: Boxes, label: t('model'), value: asset.model || '—' },
    { icon: Building2, label: t('manufacturer'), value: asset.manufacturer?.name || '—' },
    { icon: Tag, label: t('category'), value: tn(asset.category?.name) || '—' },
    { icon: MapPin, label: t('defaultLocation'), value: tn(asset.default_location?.name) || '—' },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate(backPage())} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="flex flex-col sm:flex-row">
          <div className="flex items-center justify-center w-full sm:w-48 h-48 bg-gradient-to-br from-slate-50 to-slate-100 shrink-0 overflow-hidden">
            <img
              src={asset.image_url || getAssetTypeImage(asset.category?.name, getAssetDisplayName(asset))}
              alt={getAssetDisplayName(asset)}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{getAssetDisplayName(asset)}</h1>
                <p className="text-sm text-gray-500 mt-0.5 font-mono">{asset.asset_tag}</p>
              </div>
              <StatusBadge status={asset.status} />
            </div>

            {(() => {
              const assignee = getAssetAssignee(asset);
              if (assignee) {
                return (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg mb-4">
                    <Avatar name={assignee.name} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{assignee.name}</p>
                      <p className="text-xs text-gray-500">
                        {assignee.jobTitle ? `${tn(assignee.jobTitle)} · ` : ''}
                        {assignee.email || ''}
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 text-gray-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-gray-500">{t('notAssigned')}</p>
                </div>
              );
            })()}

            <div className="flex flex-wrap gap-2">
              {canManage && (
                isAssetDeployed(asset) ? (
                  <Button onClick={handleCheckin}><ArrowRightLeft className="w-4 h-4" /> {t('checkIn')}</Button>
                ) : (
                  <Button onClick={() => setShowCheckout(true)}><ArrowRightLeft className="w-4 h-4" /> {t('checkOut')}</Button>
                )
              )}
              <Button variant="outline" onClick={generatePDF}><Printer className="w-4 h-4" /> {t('printDocument')}</Button>
              <Button variant="outline" onClick={() => navigate(backPage())}><Edit3 className="w-4 h-4" /> {t('back')}</Button>
              {canManage ? (
                <Button variant="danger" onClick={handleDelete}><Trash2 className="w-4 h-4" /> {t('delete')}</Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{t('assetDetails')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {infoItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className={`text-sm font-medium text-gray-900 ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {asset.notes && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('notes')}</p>
                  <p className="text-sm text-gray-700">{tn(asset.notes)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Checkout history */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{t('checkoutHistory')}</h3>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t('noHistoryYet')}</p>
          ) : (
            <div className="space-y-4">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                    h.action === 'checkout' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize">{t(h.action as TranslationKey)}</p>
                    <p className="text-xs text-gray-500">
                      {h.assigned_to ? `${h.assigned_to.first_name} ${h.assigned_to.last_name || ''}` : t('system')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      <Modal
        open={canManage && showCheckout}
        onClose={() => setShowCheckout(false)}
        title={t('checkOut')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCheckout(false)}>{t('cancel')}</Button>
            <Button onClick={handleCheckout} disabled={!checkoutUser}>{t('checkOut')}</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 mb-3"><span className="font-medium text-gray-900">{getAssetDisplayName(asset)}</span> {t('assignAssetTo')}</p>
        <Select label={t('assignTo')} value={checkoutUser} onChange={(e) => setCheckoutUser(e.target.value)}>
          <option value="">{t('selectUser')}</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} — {tn(u.job_title) || t('employee')}</option>)}
        </Select>
      </Modal>
    </div>
  );
}
