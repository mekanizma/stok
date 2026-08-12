import { useState, useEffect, useMemo } from 'react';
import { supabase, type CheckoutHistory } from '@/lib/supabase';
import { ScrollText, ArrowRightLeft } from 'lucide-react';
import { PageHeader, EmptyState, Avatar, TablePagination, type PageSize } from '@/components/ui';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { getAssetDisplayName, getAssetAssignee } from '@/lib/assetAssignee';
import { repairTurkishName } from '@/lib/turkishNames';

function assigneeLabel(h: CheckoutHistory) {
  if (h.given_to?.trim()) return repairTurkishName(h.given_to.trim());
  if (h.assigned_to) {
    return repairTurkishName(`${h.assigned_to.first_name} ${h.assigned_to.last_name || ''}`.trim());
  }
  const fromAsset = getAssetAssignee(h.asset);
  if (fromAsset?.name) return fromAsset.name;
  const note = h.note || '';
  const m = note.match(/—\s*(.+?)(?:\s*\(|$)/);
  return m?.[1]?.trim() || '';
}

function itemLabel(h: CheckoutHistory) {
  if (h.asset) return getAssetDisplayName(h.asset);
  if (h.accessory?.name) return h.accessory.name;
  if (h.consumable?.name) return h.consumable.name;
  return '';
}

export default function ActivityPage() {
  const { t, tn, lang } = useI18n();
  const [history, setHistory] = useState<CheckoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('checkout_history')
        .select('*, asset:assets(*, assigned_to:users(*)), accessory:accessories(id, name), consumable:consumables(id, name), assigned_to:users(*)')
        .order('created_at', { ascending: false })
        .limit(2000);
      setHistory((data as CheckoutHistory[]) || []);
      setLoading(false);
    })();
  }, []);

  const totalPages = Math.max(1, Math.ceil(history.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedHistory = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return history.slice(start, start + pageSize);
  }, [history, safePage, pageSize]);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <PageHeader title={t('activityLog')} description={t('activityLogDesc')} />

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-lg" />)}
        </div>
      ) : history.length === 0 ? (
        <EmptyState icon={ScrollText} title={t('noActivityYet')} description={t('activityLogDesc')} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="space-y-1">
              {pagedHistory.map((h, idx) => {
                const assignee = assigneeLabel(h);
                const performerName = repairTurkishName(h.performed_by_name || '') || h.performed_by_email || '';
                return (
                  <div key={h.id} className="flex items-start gap-3 py-3 relative">
                    {idx < pagedHistory.length - 1 && (
                      <div className="absolute left-[15px] top-12 bottom-0 w-px bg-gray-200" />
                    )}
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 z-10 ${
                      h.action === 'checkout' ? 'bg-blue-50 text-blue-600' : h.action === 'checkin' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                        <p className="text-sm text-gray-900 min-w-0">
                          <span className="font-medium">{t(h.action as TranslationKey)}</span>
                          {itemLabel(h) ? (
                            <span className="text-gray-500"> — {itemLabel(h)}{h.qty ? ` (${h.qty} ${t('pcs')})` : ''}</span>
                          ) : null}
                        </p>
                        <span className="text-xs text-gray-400 shrink-0">
                          {new Date(h.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-medium text-gray-400 shrink-0 w-20">{t('assignedPerson')}</span>
                          {assignee ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar name={assignee} size="sm" />
                              <span className="text-xs text-gray-600 truncate">{assignee}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-medium text-gray-400 shrink-0 w-20">{t('performedBy')}</span>
                          {performerName ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar name={performerName} size="sm" />
                              <div className="min-w-0">
                                <p className="text-xs text-gray-700 truncate">{performerName}</p>
                                {h.performed_by_email ? (
                                  <p className="text-[11px] text-gray-400 truncate">{h.performed_by_email}</p>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">{t('system')}</span>
                          )}
                        </div>
                      </div>

                      {h.note && <p className="text-xs text-gray-400 mt-2 break-words">{tn(h.note)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <TablePagination
            page={safePage}
            pageSize={pageSize}
            total={history.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
}
