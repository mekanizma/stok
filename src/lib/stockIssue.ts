import { supabase, type Asset, type CheckoutHistory } from '@/lib/supabase';
import { insertCheckoutHistory } from '@/lib/checkoutHistory';
import { createdByStamp } from '@/lib/createdBy';

export type StockKind = 'accessory' | 'consumable' | 'asset';

export function assetStock(asset: Pick<Asset, 'qty' | 'remaining_qty'> | null | undefined) {
  const qty = Math.max(1, Number(asset?.qty) || 1);
  const remaining = Math.max(0, Number(asset?.remaining_qty ?? qty) || 0);
  return { qty, remaining, used: Math.max(0, qty - remaining) };
}

export async function fetchStockIssues(kind: StockKind) {
  const col = kind === 'accessory' ? 'accessory_id' : kind === 'consumable' ? 'consumable_id' : 'asset_id';
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
  kind: 'accessory' | 'consumable';
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

    const createdBy = await createdByStamp();
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
        qty,
        remaining_qty: 0,
        min_qty: 1,
        assigned_to_id: opts.assignedToId || null,
        assignee_name: givenTo,
        assignee_email: null,
        notes: noteLine,
        ...createdBy,
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

/** Issue some (or all) of a demirbaş quantity. Partial issues become a separate zimmet record. */
export async function issueAssetStock(opts: {
  asset: Asset;
  qty: number;
  givenTo: string;
  assignedToId?: string | null;
  note?: string;
}) {
  const { remaining, qty: totalQty } = assetStock(opts.asset);
  const qty = Math.max(1, Math.floor(opts.qty));
  if (qty > remaining) throw new Error('not_enough_stock');
  const givenTo = opts.givenTo.trim();
  if (!givenTo) throw new Error('given_to_required');

  const extra = opts.note?.trim() || null;

  if (qty >= remaining) {
    const { error: updErr } = await supabase.from('assets').update({
      status: 'deployed',
      remaining_qty: 0,
      assigned_to_id: opts.assignedToId || null,
      assignee_name: givenTo,
      assignee_email: null,
    }).eq('id', opts.asset.id);
    if (updErr) throw updErr;

    const { error: histErr } = await insertCheckoutHistory({
      asset_id: opts.asset.id,
      assigned_to_id: opts.assignedToId || null,
      action: 'checkout',
      qty,
      given_to: givenTo,
      note: extra,
    });
    if (histErr) throw histErr;
    return 0;
  }

  const nextQty = Math.max(1, totalQty - qty);
  const nextRemaining = remaining - qty;
  const { error: updErr } = await supabase.from('assets').update({
    qty: nextQty,
    remaining_qty: nextRemaining,
  }).eq('id', opts.asset.id);
  if (updErr) throw updErr;

  const stamp = Date.now().toString(36).toUpperCase();
  const { data: created, error: assetError } = await supabase
    .from('assets')
    .insert({
      asset_tag: `AST-${stamp}`,
      name: opts.asset.name,
      serial: null,
      model: opts.asset.model,
      manufacturer_id: opts.asset.manufacturer_id,
      category_id: opts.asset.category_id,
      default_location_id: opts.asset.default_location_id,
      status: 'deployed',
      qty,
      remaining_qty: 0,
      min_qty: opts.asset.min_qty ?? 1,
      assigned_to_id: opts.assignedToId || null,
      assignee_name: givenTo,
      assignee_email: null,
      notes: extra,
      created_by_name: opts.asset.created_by_name || null,
      created_by_email: opts.asset.created_by_email || null,
    })
    .select('id')
    .single();
  if (assetError) throw assetError;

  const { error: origHistErr } = await insertCheckoutHistory({
    asset_id: opts.asset.id,
    assigned_to_id: opts.assignedToId || null,
    action: 'checkout',
    qty,
    given_to: givenTo,
    note: extra,
  });
  if (origHistErr) throw origHistErr;

  if (created?.id) {
    const { error: copyHistErr } = await insertCheckoutHistory({
      asset_id: created.id,
      assigned_to_id: opts.assignedToId || null,
      action: 'checkout',
      qty,
      given_to: givenTo,
      note: extra,
    });
    if (copyHistErr) throw copyHistErr;
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
