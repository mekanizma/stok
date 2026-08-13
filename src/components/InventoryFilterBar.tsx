import { Search, Tags, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export type CategoryFilterOption = {
  id: string;
  label: string;
  count: number;
};

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (id: string) => void;
  categories: CategoryFilterOption[];
  totalCount: number;
  searchPlaceholder?: string;
}

/** Compact search + category select for inventory pages (mobile-friendly). */
export function InventoryFilterBar({
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  categories,
  totalCount,
  searchPlaceholder,
}: Props) {
  const { t } = useI18n();
  const active = categories.find((c) => c.id === categoryId);
  const withItems = categories.filter((c) => c.count > 0);
  const empty = categories.filter((c) => c.count === 0);

  return (
    <div className="mb-4 space-y-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-2 sm:p-2.5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder || t('searchInventory')}
              className="w-full h-11 pl-9 pr-3 text-sm rounded-xl border border-gray-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
          <div className="relative sm:w-64 shrink-0">
            <Tags className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={categoryId}
              onChange={(e) => onCategoryChange(e.target.value)}
              aria-label={t('category')}
              className="w-full h-11 appearance-none pl-9 pr-9 text-sm rounded-xl border border-gray-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            >
              <option value="">{t('allCategories')} ({totalCount})</option>
              {withItems.map((c) => (
                <option key={c.id} value={c.id}>{c.label} ({c.count})</option>
              ))}
              {empty.length > 0 ? (
                <optgroup label={t('emptyCategories')}>
                  {empty.map((c) => (
                    <option key={c.id} value={c.id}>{c.label} (0)</option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
          </div>
        </div>
      </div>

      {active ? (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-gray-500">{t('activeFilter')}:</span>
          <button
            type="button"
            onClick={() => onCategoryChange('')}
            className="inline-flex items-center gap-1.5 max-w-full rounded-lg bg-brand-50 text-brand-800 border border-brand-100 px-2.5 py-1 text-xs font-medium hover:bg-brand-100 transition-colors"
          >
            <span className="truncate">{active.label}</span>
            <span className="tabular-nums text-brand-600/70">{active.count}</span>
            <X className="w-3.5 h-3.5 shrink-0 opacity-70" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
