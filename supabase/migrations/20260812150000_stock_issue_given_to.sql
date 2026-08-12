/*
  Track where accessory/consumable stock was issued.
*/

ALTER TABLE public.checkout_history
  ADD COLUMN IF NOT EXISTS qty int;

ALTER TABLE public.checkout_history
  ADD COLUMN IF NOT EXISTS given_to text;

CREATE INDEX IF NOT EXISTS idx_checkout_history_accessory
  ON public.checkout_history (accessory_id);

CREATE INDEX IF NOT EXISTS idx_checkout_history_consumable
  ON public.checkout_history (consumable_id);
