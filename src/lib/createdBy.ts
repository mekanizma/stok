import { getCurrentActor } from '@/lib/checkoutHistory';
import { repairTurkishName } from '@/lib/turkishNames';

export const DEFAULT_INVENTORY_CREATOR = 'Bilal Ugurel';

export function inventoryCreatorName(name: string | null | undefined) {
  const trimmed = (name || '').trim();
  if (!trimmed) return DEFAULT_INVENTORY_CREATOR;
  const lower = trimmed.toLocaleLowerCase('tr-TR');
  if (lower === 'sistem' || lower === 'system') return DEFAULT_INVENTORY_CREATOR;
  return repairTurkishName(trimmed);
}

export async function createdByStamp() {
  const actor = await getCurrentActor();
  return {
    created_by_name: actor.name ? repairTurkishName(actor.name) : DEFAULT_INVENTORY_CREATOR,
    created_by_email: actor.email,
  };
}
