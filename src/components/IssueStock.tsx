import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button, Input, Modal, Select, TablePagination, Textarea } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { type CheckoutHistory, type Location, type UserRecord } from '@/lib/supabase';
import { issueGivenTo, type StockKind } from '@/lib/stockIssue';
import { repairTurkishName } from '@/lib/turkishNames';

export function IssueHistoryLines({
  issues,
  limit = 3,
}: {
  issues: CheckoutHistory[];
  limit?: number;
}) {
  const { t, lang } = useI18n();
  const shown = issues.slice(0, limit);
  if (shown.length === 0) {
    return <p className="text-xs text-gray-400">{t('noIssuesYet')}</p>;
  }
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  return (
    <ul className="space-y-1.5">
      {shown.map((h) => {
        const to = issueGivenTo(h) || '—';
        const qty = h.qty ?? 1;
        return (
          <li key={h.id} className="flex items-start justify-between gap-2 text-xs">
            <span className="min-w-0 text-gray-700">
              <span className="font-semibold text-gray-900">{qty}</span>
              {' '}{t('pcs')}
              <span className="text-gray-400"> → </span>
              <span className="font-medium">{repairTurkishName(to)}</span>
            </span>
            <span className="shrink-0 text-gray-400">
              {new Date(h.created_at).toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function IssueStockModal({
  open,
  kind,
  itemId,
  itemName,
  remaining,
  users,
  locations,
  history,
  saving,
  error,
  onClose,
  onIssue,
}: {
  open: boolean;
  kind: StockKind;
  itemId: string;
  itemName: string;
  remaining: number;
  users: UserRecord[];
  locations: Location[];
  history: CheckoutHistory[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onIssue: (opts: { qty: number; givenTo: string; assignedToId: string | null; note: string }) => void;
}) {
  const { t } = useI18n();
  const [qty, setQty] = useState(1);
  const [locationId, setLocationId] = useState('');
  const [personName, setPersonName] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setQty(1);
    setLocationId('');
    setPersonName('');
    setNote('');
  }, [open, itemId]);

  const locationName = locations.find((l) => l.id === locationId)?.name || '';
  const composed = useMemo(() => {
    return [locationName, personName.trim()].filter(Boolean).join(' — ');
  }, [locationName, personName]);

  const canSave = remaining > 0 && qty >= 1 && qty <= remaining && personName.trim().length > 0 && !saving;

  const bump = (delta: number) => {
    setQty((n) => Math.min(remaining, Math.max(1, n + delta)));
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('issueStock')}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>{t('cancel')}</Button>
          <Button
            onClick={() => onIssue({
              qty,
              givenTo: composed,
              assignedToId: null,
              note,
            })}
            disabled={!canSave}
            className="w-full sm:w-auto"
          >
            {saving ? t('saving') : t('issueConfirm')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
          <p className="text-sm font-semibold text-gray-900 truncate">{itemName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t('inStock')}: {remaining}</p>
        </div>

        <div>
          <label className="block mb-1.5 text-sm font-medium text-gray-700">{t('issueQty')}</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => bump(-1)}
              disabled={qty <= 1}
              className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
              aria-label="-"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              min={1}
              max={remaining}
              value={qty}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (Number.isNaN(n)) { setQty(1); return; }
                setQty(Math.min(remaining, Math.max(1, n)));
              }}
              className="flex-1 h-11 text-center text-lg font-semibold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
            <button
              type="button"
              onClick={() => bump(1)}
              disabled={qty >= remaining}
              className="flex items-center justify-center w-11 h-11 rounded-xl border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
              aria-label="+"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Select
          label={t('issueLocation')}
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="">{t('selectOptional')}</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </Select>

        <Input
          label={`${t('issuePerson')} *`}
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          placeholder={t('issuePersonPlaceholder')}
          autoComplete="name"
        />

        <Textarea
          label={t('notes')}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('issueNotePlaceholder')}
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div>
          <p className="text-sm font-medium text-gray-800 mb-2">{t('issueHistory')}</p>
          <IssueHistoryLines issues={history.filter((h) => {
            if (kind === 'accessory') return h.accessory_id === itemId;
            if (kind === 'consumable') return h.consumable_id === itemId;
            return h.asset_id === itemId;
          })} limit={8} />
        </div>
      </div>
    </Modal>
  );
}

export function IssueMeta({
  issues,
  itemName,
  onIssue,
  disabled,
  dark,
}: {
  issues: CheckoutHistory[];
  itemName?: string;
  onIssue: () => void;
  disabled?: boolean;
  dark?: boolean;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const last = issues[0];
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(issues.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedIssues = issues.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (open) setPage(1);
  }, [open]);

  return (
    <>
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="min-w-0">
          {last ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={`w-full text-left text-[11px] truncate ${dark ? 'text-stone-400 hover:text-stone-200' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <span className={`font-semibold ${dark ? 'text-stone-100' : 'text-gray-800'}`}>{last.qty ?? 1}</span>
              {' '}{t('pcs')}
              <span className={dark ? 'text-stone-500' : 'text-gray-400'}> → </span>
              <span className={dark ? 'text-stone-200' : 'text-gray-700'}>{repairTurkishName(issueGivenTo(last) || '—')}</span>
              <span className={dark ? 'text-stone-500' : 'text-gray-400'}> · {new Date(last.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}</span>
            </button>
          ) : (
            <p className={`text-[11px] truncate ${dark ? 'text-stone-500' : 'text-gray-400'}`}>{t('noIssuesYet')}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onIssue}
          disabled={disabled}
          className={`w-full h-8 rounded-lg text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed ${
            dark
              ? 'bg-[#f7ba2b] text-black hover:bg-[#ffd056]'
              : 'bg-brand-600 text-white hover:bg-brand-700'
          }`}
        >
          {t('issueStock')}
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('issueDetail')}
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => setOpen(false)} className="w-full sm:w-auto">{t('close')}</Button>
        }
      >
        <div className="space-y-3">
          {itemName ? <p className="text-sm font-semibold text-gray-900">{itemName}</p> : null}
          {issues.length === 0 ? (
            <p className="text-sm text-gray-500">{t('noIssuesYet')}</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-100">
                {pagedIssues.map((h) => {
                  const to = repairTurkishName(issueGivenTo(h) || '—');
                  const when = new Date(h.created_at).toLocaleString(locale);
                  const actor = repairTurkishName(h.performed_by_name || '') || h.performed_by_email || t('system');
                  return (
                    <li key={h.id} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">{h.qty ?? 1}</span> {t('pcs')}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        <span className="text-[11px] text-gray-400">{t('issuePerson')}</span>
                        <span className="block font-medium">{to}</span>
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        <span className="text-[11px] text-gray-400">{t('issuedAt')}</span>
                        <span className="block">{when}</span>
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        <span className="text-[11px] text-gray-400">{t('performedBy')}</span>
                        <span className="block">{actor}</span>
                      </p>
                      {h.note ? <p className="text-xs text-gray-500 mt-1">{h.note}</p> : null}
                    </li>
                  );
                })}
              </ul>
              {issues.length > pageSize ? (
                <div className="-mx-1 rounded-xl border border-gray-200 overflow-hidden">
                  <TablePagination
                    page={safePage}
                    pageSize={pageSize}
                    total={issues.length}
                    onPageChange={setPage}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
