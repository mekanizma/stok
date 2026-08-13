import { supabase, type Category } from '@/lib/supabase';
import { canonicalEntityName, categoryIdentityKey, resolveEntityPair } from '@/lib/entityI18n';

const REF_TABLES = ['assets', 'accessories', 'consumables', 'licenses'] as const;

/**
 * Merge categories that are the same after TR/EN normalization (same type).
 * Keeps the oldest row, re-points FKs, deletes extras.
 */
export async function mergeDuplicateCategories(categories: Category[]): Promise<number> {
  const groups = new Map<string, Category[]>();
  for (const c of categories) {
    const key = categoryIdentityKey(c);
    const list = groups.get(key) || [];
    list.push(c);
    groups.set(key, list);
  }

  let removed = 0;

  for (const list of groups.values()) {
    if (list.length < 2) continue;

    const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const keeper = sorted[0];
    const dupes = sorted.slice(1);
    const pair = resolveEntityPair({ source: keeper.name });
    const canonical = canonicalEntityName(pair) || keeper.name;

    if (keeper.name !== canonical) {
      await supabase.from('categories').update({ name: canonical }).eq('id', keeper.id);
    }

    for (const d of dupes) {
      for (const table of REF_TABLES) {
        await supabase.from(table).update({ category_id: keeper.id }).eq('category_id', d.id);
      }
      const { error } = await supabase.from('categories').delete().eq('id', d.id);
      if (!error) removed += 1;
    }
  }

  return removed;
}

export function findExistingCategory(
  categories: Category[],
  opts: { name: string; type: string; excludeId?: string },
): Category | undefined {
  const key = categoryIdentityKey({ name: opts.name, type: opts.type });
  return categories.find((c) => c.id !== opts.excludeId && categoryIdentityKey(c) === key);
}
