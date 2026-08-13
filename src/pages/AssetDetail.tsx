import { useState, useEffect } from 'react';
import { supabase, type Asset, type Location, type CheckoutHistory } from '@/lib/supabase';
import { ArrowLeft, Boxes, Tag, FileText, ArrowRightLeft, Edit3, Trash2, MapPin, User as UserIcon, Building2, Package, Printer, QrCode, Copy, Check } from 'lucide-react';
import { type Page } from '@/App';
import { StatusBadge, Button, Avatar, Modal, Select, Input, Textarea } from '@/components/ui';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { getAssetTypeImage } from '@/lib/assetImages';
import { getAssetAssignee, isAssetDeployed, getAssetDisplayName, getAssetInventoryName } from '@/lib/assetAssignee';
import { insertCheckoutHistory } from '@/lib/checkoutHistory';
import { assetDeepLink } from '@/lib/assetLinks';
import { qrDataUrl } from '@/lib/qrCode';
import { repairTurkishName } from '@/lib/turkishNames';

interface Props {
  assetId: string;
  navigate: (p: Page) => void;
  onRefresh: () => void;
  locations: Location[];
  canManage?: boolean;
  canDelete?: boolean;
}

export default function AssetDetail({ assetId, navigate, onRefresh, locations, canManage = false, canDelete = false }: Props) {
  const { t, tn, lang } = useI18n();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<CheckoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinLocationId, setCheckinLocationId] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [issuePerson, setIssuePerson] = useState('');
  const [issueLocationId, setIssueLocationId] = useState('');
  const [issueNote, setIssueNote] = useState('');
  const [issueError, setIssueError] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [labelBusy, setLabelBusy] = useState(false);

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

  useEffect(() => {
    if (!assetId) return;
    const link = assetDeepLink(assetId);
    setDeepLink(link);
    void qrDataUrl(link, 280).then(setQrUrl).catch(() => setQrUrl(''));
  }, [assetId]);

  const handleCheckin = async () => {
    if (!canManage || !asset || !isAssetDeployed(asset) || !checkinLocationId) return;
    setCheckingIn(true);
    try {
      const assignee = getAssetAssignee(asset);
      const locName = locations.find((l) => l.id === checkinLocationId)?.name || '';
      const noteBase = assignee ? `${t('checkedIn')} — ${assignee.name}${assignee.email ? ` (${assignee.email})` : ''}` : t('checkedIn');
      await insertCheckoutHistory({
        asset_id: asset.id,
        assigned_to_id: asset.assigned_to_id,
        action: 'checkin',
        note: locName ? `${noteBase} → ${locName}` : noteBase,
      });
      await supabase.from('assets').update({
        assigned_to_id: null,
        assignee_name: null,
        assignee_email: null,
        status: 'ready',
        default_location_id: checkinLocationId,
      }).eq('id', asset.id);
      setShowCheckin(false);
      setCheckinLocationId('');
      fetchAsset();
      fetchHistory();
      onRefresh();
    } finally {
      setCheckingIn(false);
    }
  };

  const handleIssue = async () => {
    if (!canManage || !asset || isAssetDeployed(asset)) return;
    const person = issuePerson.trim();
    if (!person) {
      setIssueError(t('givenToRequired'));
      return;
    }
    setIssuing(true);
    setIssueError('');
    try {
      const locationName = locations.find((l) => l.id === issueLocationId)?.name || '';
      const givenTo = repairTurkishName([locationName, person].filter(Boolean).join(' — '));
      const { error: updErr } = await supabase.from('assets').update({
        status: 'deployed',
        assigned_to_id: null,
        assignee_name: givenTo,
        assignee_email: null,
      }).eq('id', asset.id);
      if (updErr) throw updErr;

      const noteParts = [t('checkedOutFromAssets'), issueNote.trim()].filter(Boolean);
      const { error: histErr } = await insertCheckoutHistory({
        asset_id: asset.id,
        action: 'checkout',
        qty: 1,
        given_to: givenTo,
        note: noteParts.join(' — ') || null,
      });
      if (histErr) throw histErr;

      setShowIssue(false);
      setIssuePerson('');
      setIssueLocationId('');
      setIssueNote('');
      fetchAsset();
      fetchHistory();
      onRefresh();
    } catch (e) {
      setIssueError(e instanceof Error ? e.message : String(e));
    } finally {
      setIssuing(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || !asset) return;
    await supabase.from('assets').delete().eq('id', asset.id);
    onRefresh();
    navigate({ name: asset?.status === 'deployed' ? 'deployed-assets' : 'checked-in-assets' });
  };

  const copyLink = async () => {
    if (!deepLink) return;
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const printLabel = async () => {
    if (!asset) return;
    setLabelBusy(true);
    try {
      const link = deepLink || assetDeepLink(asset.id);
      const qr = qrUrl || await qrDataUrl(link, 320);
      const title = getAssetInventoryName(asset);
      const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t('printLabel')} — ${asset.asset_tag}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Segoe UI,Tahoma,sans-serif;background:#f1f5f9;color:#0f172a;padding:16px}
.label{width:320px;max-width:100%;margin:0 auto;background:#fff;border:2px solid #0f172a;border-radius:12px;padding:16px;text-align:center}
.uni{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#475569;margin-bottom:8px}
.name{font-size:16px;font-weight:700;margin-bottom:4px;word-break:break-word}
.tag{font-family:ui-monospace,Consolas,monospace;font-size:14px;font-weight:600;margin:8px 0}
.meta{font-size:12px;color:#64748b;margin-bottom:10px}
.qr{width:180px;height:180px;margin:8px auto;display:block}
.hint{font-size:11px;color:#64748b;margin-top:8px}
.actions{text-align:center;margin-top:16px}
.btn{background:#0f172a;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:14px;cursor:pointer}
@media print{body{background:#fff;padding:0}.actions{display:none}.label{border-radius:0;width:100%;max-width:70mm}}
</style></head><body>
<div class="label">
  <div class="uni">${t('universityName')}</div>
  <div class="name">${title}</div>
  <div class="tag">${asset.asset_tag}</div>
  <div class="meta">${[asset.serial, asset.model].filter(Boolean).join(' · ') || '—'}</div>
  ${qr ? `<img class="qr" src="${qr}" alt="QR" />` : ''}
  <div class="hint">${t('labelScanHint')}</div>
</div>
<div class="actions"><button class="btn" onclick="window.print()">${t('printLabel')}</button></div>
<script>setTimeout(function(){window.print()},400)</script>
</body></html>`;
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(html);
      w.document.close();
    } finally {
      setLabelBusy(false);
    }
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

  const deployed = isAssetDeployed(asset);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate(backPage())} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {backLabel}
      </button>

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
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">{getAssetDisplayName(asset)}</h1>
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
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{assignee.name}</p>
                      <p className="text-xs text-gray-500 truncate">
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
              {canManage && deployed ? (
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setCheckinLocationId(asset.default_location_id || '');
                    setShowCheckin(true);
                  }}
                >
                  <ArrowRightLeft className="w-4 h-4" /> {t('checkIn')}
                </Button>
              ) : null}
              {canManage && !deployed ? (
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setShowIssue(true);
                    setIssueError('');
                    setIssuePerson('');
                    setIssueLocationId('');
                    setIssueNote('');
                  }}
                >
                  <ArrowRightLeft className="w-4 h-4" /> {t('quickIssue')}
                </Button>
              ) : null}
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => { void printLabel(); }} disabled={labelBusy}>
                <QrCode className="w-4 h-4" /> {t('printLabel')}
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={generatePDF}>
                <Printer className="w-4 h-4" /> {t('printDocument')}
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate(backPage())}>
                <Edit3 className="w-4 h-4" /> {t('back')}
              </Button>
              {canDelete ? (
                <Button variant="danger" className="w-full sm:w-auto" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" /> {t('delete')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className={`text-sm font-medium text-gray-900 truncate ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
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

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-1">{t('qrCode')}</h3>
            <p className="text-xs text-gray-500 mb-4">{t('printLabelDesc')}</p>
            <div className="flex flex-col items-center gap-3">
              {qrUrl ? (
                <img src={qrUrl} alt="QR" className="w-44 h-44 rounded-lg border border-gray-100 bg-white" />
              ) : (
                <div className="w-44 h-44 rounded-lg bg-gray-100 animate-pulse" />
              )}
              <p className="text-[11px] text-center text-gray-400 break-all px-1">{deepLink}</p>
              <Button variant="outline" size="sm" className="w-full" onClick={() => { void copyLink(); }}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('linkCopied') : t('copyAssetLink')}
              </Button>
              <Button size="sm" className="w-full" onClick={() => { void printLabel(); }} disabled={labelBusy}>
                <QrCode className="w-3.5 h-3.5" /> {t('printLabel')}
              </Button>
            </div>
          </div>

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
                      <p className="text-xs text-gray-500 truncate">
                        {h.assigned_to ? `${h.assigned_to.first_name} ${h.assigned_to.last_name || ''}` : (h.given_to || t('system'))}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(h.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={canManage && showIssue}
        onClose={() => { if (!issuing) setShowIssue(false); }}
        title={t('quickIssue')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowIssue(false)} disabled={issuing}>{t('cancel')}</Button>
            <Button onClick={() => { void handleIssue(); }} disabled={issuing || !issuePerson.trim()} className="w-full sm:w-auto">
              {issuing ? t('saving') : t('issueConfirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <p className="text-sm font-semibold text-gray-900 truncate">{getAssetInventoryName(asset)}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{asset.asset_tag}</p>
          </div>
          <Select
            label={t('issueLocation')}
            value={issueLocationId}
            onChange={(e) => setIssueLocationId(e.target.value)}
          >
            <option value="">{t('selectOptional')}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{tn(l.name)}</option>
            ))}
          </Select>
          <Input
            label={`${t('issuePerson')} *`}
            value={issuePerson}
            onChange={(e) => setIssuePerson(e.target.value)}
            placeholder={t('issuePersonPlaceholder')}
            autoComplete="name"
          />
          <Textarea
            label={t('notes')}
            rows={2}
            value={issueNote}
            onChange={(e) => setIssueNote(e.target.value)}
            placeholder={t('issueNotePlaceholder')}
          />
          {issueError ? <p className="text-sm text-red-600">{issueError}</p> : null}
        </div>
      </Modal>

      <Modal
        open={canManage && showCheckin}
        onClose={() => { if (!checkingIn) { setShowCheckin(false); setCheckinLocationId(''); } }}
        title={t('checkInConfirmTitle')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCheckin(false); setCheckinLocationId(''); }} disabled={checkingIn}>{t('cancel')}</Button>
            <Button onClick={() => { void handleCheckin(); }} disabled={checkingIn || !checkinLocationId} className="w-full sm:w-auto">
              {checkingIn ? t('saving') : t('checkIn')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('checkInConfirmMsg', { name: getAssetDisplayName(asset) })}</p>
          <Select
            label={`${t('checkInLocation')} *`}
            value={checkinLocationId}
            onChange={(e) => setCheckinLocationId(e.target.value)}
          >
            <option value="">{t('selectLocation')}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{tn(l.name)}</option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
