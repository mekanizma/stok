import { supabase, type CheckoutAction } from '@/lib/supabase';

export type CheckoutHistoryInsert = {
  asset_id?: string | null;
  accessory_id?: string | null;
  consumable_id?: string | null;
  license_id?: string | null;
  assigned_to_id?: string | null;
  action: CheckoutAction;
  note?: string | null;
  qty?: number | null;
  given_to?: string | null;
};

async function currentActor() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return { name: null as string | null, email: null as string | null };

  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const first = String(meta.first_name || '').trim();
  const last = String(meta.last_name || '').trim();
  const full = String(meta.full_name || '').trim();
  const name = [first, last].filter(Boolean).join(' ') || full || user.email || null;
  const email = user.email?.trim().toLowerCase() || null;
  return { name, email };
}

export async function getCurrentActor() {
  return currentActor();
}

/** Insert checkout_history row and stamp the logged-in staff account. */
export async function insertCheckoutHistory(row: CheckoutHistoryInsert) {
  const actor = await currentActor();
  return supabase.from('checkout_history').insert({
    ...row,
    performed_by_name: actor.name,
    performed_by_email: actor.email,
  });
}
