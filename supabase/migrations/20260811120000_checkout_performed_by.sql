/*
# Track which staff account performed checkout / checkin / audit actions
*/

ALTER TABLE public.checkout_history
  ADD COLUMN IF NOT EXISTS performed_by_name text;

ALTER TABLE public.checkout_history
  ADD COLUMN IF NOT EXISTS performed_by_email text;

CREATE INDEX IF NOT EXISTS idx_checkout_history_performed_by_email
  ON public.checkout_history (performed_by_email);
