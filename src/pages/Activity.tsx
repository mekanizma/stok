import { useState, useEffect } from 'react';
import { supabase, type CheckoutHistory } from '@/lib/supabase';
import { ScrollText, ArrowRightLeft } from 'lucide-react';
import { PageHeader, EmptyState, Avatar } from '@/components/ui';
import { useI18n, type TranslationKey } from '@/lib/i18n';

export default function ActivityPage() {
  const { t, lang } = useI18n();
  const [history, setHistory] = useState<CheckoutHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('checkout_history')
        .select('*, asset:assets(*), assigned_to:users(*)')
        .order('created_at', { ascending: false })
        .limit(50);
      setHistory((data as CheckoutHistory[]) || []);
      setLoading(false);
    })();
  }, []);

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
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="space-y-1">
            {history.map((h, idx) => (
              <div key={h.id} className="flex items-start gap-3 py-3 relative">
                {idx < history.length - 1 && (
                  <div className="absolute left-[15px] top-12 bottom-0 w-px bg-gray-200" />
                )}
                <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 z-10 ${
                  h.action === 'checkout' ? 'bg-blue-50 text-blue-600' : h.action === 'checkin' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{t(h.action as TranslationKey)}</span>
                      {h.asset?.name && <span className="text-gray-500"> — {h.asset.name}</span>}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0">{new Date(h.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {h.assigned_to ? (
                      <>
                        <Avatar name={`${h.assigned_to.first_name} ${h.assigned_to.last_name || ''}`} size="sm" />
                        <span className="text-xs text-gray-500">{h.assigned_to.first_name} {h.assigned_to.last_name}</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">{t('system')}</span>
                    )}
                  </div>
                  {h.note && <p className="text-xs text-gray-400 mt-1">{h.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
