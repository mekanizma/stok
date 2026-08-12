import { supabase, type CheckoutHistory } from '@/lib/supabase';
import { insertCheckoutHistory } from '@/lib/checkoutHistory';

export type StockKind = 'accessory' | 'consumable';

export async function fetchStockIssues(kind: StockKind) {
  const col = kind === 'accessory' ? 'accessory_id' : 'consumable_id';
  const { data, error } = await supabase
    .from('checkout_history')
    .select('*, assigned_to:users(*)')
    .eq('action', 'checkout')
    .not(col, 'is', null)
    .order('created_at', { ascending: false })
    .limit(400);
  if (error) throw error;
  return (data as CheckoutHistory[]) || [];
}

export async function issueStock(opts: {
  kind: StockKind;
  itemId: string;
  remaining: number;
  qty: number;
  givenTo: string;
  assignedToId?: string | null;
  note?: string;
  /** When accessory is issued, also create a deployed asset so it appears under Zimmetli. */
  itemName?: string;
  categoryId?: string | null;
  manufacturerId?: string | null;
  locationId?: string | null;
  serial?: string | null;
}) {
  const qty = Math.max(1, Math.floor(opts.qty));
  if (qty > opts.remaining) {
    throw new Error('not_enough_stock');
  }
  const givenTo = opts.givenTo.trim();
  if (!givenTo) throw new Error('given_to_required');

  const table = opts.kind === 'accessory' ? 'accessories' : 'consumables';
  const nextRemaining = opts.remaining - qty;

  const { error: updateError } = await supabase
    .from(table)
    .update({ remaining_qty: nextRemaining })
    .eq('id', opts.itemId);
  if (updateError) throw updateError;

  const extra = opts.note?.trim();
  const { error: histError } = await insertCheckoutHistory({
    accessory_id: opts.kind === 'accessory' ? opts.itemId : null,
    consumable_id: opts.kind === 'consumable' ? opts.itemId : null,
    assigned_to_id: opts.assignedToId || null,
    action: 'checkout',
    qty,
    given_to: givenTo,
    note: extra || null,
  });
  if (histError) throw histError;

  // Aksesuar verilişi → zimmetli listesinde görünsün
  if (opts.kind === 'accessory') {
    const stamp = Date.now().toString(36).toUpperCase();
    const tag = `ACC-${stamp}`;
    const name = (opts.itemName || 'Aksesuar').trim();
    const noteLine = [
      `Aksesuar zimmeti`,
      qty > 1 ? `${qty} adet` : null,
      extra || null,
    ].filter(Boolean).join(' · ');

    const { data: created, error: assetError } = await supabase
      .from('assets')
      .insert({
        asset_tag: tag,
        name,
        serial: opts.serial?.trim() || null,
        model: null,
        manufacturer_id: opts.manufacturerId || null,
        category_id: opts.categoryId || null,
        default_location_id: opts.locationId || null,
        status: 'deployed',
        assigned_to_id: opts.assignedToId || null,
        assignee_name: givenTo,
        assignee_email: null,
        notes: noteLine,
      })
      .select('id')
      .single();

    if (assetError) throw assetError;

    if (created?.id) {
      await insertCheckoutHistory({
        asset_id: created.id,
        accessory_id: opts.itemId,
        assigned_to_id: opts.assignedToId || null,
        action: 'checkout',
        qty,
        given_to: givenTo,
        note: noteLine,
      });
    }
  }

  return nextRemaining;
}

export function issueGivenTo(h: CheckoutHistory) {
  if (h.given_to?.trim()) return h.given_to.trim();
  if (h.assigned_to) {
    return `${h.assigned_to.first_name} ${h.assigned_to.last_name || ''}`.trim();
  }
  return '';
}
