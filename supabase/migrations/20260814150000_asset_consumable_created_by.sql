-- Who created each asset / consumable (same as accessories).
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS created_by_name text;

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS created_by_email text;

CREATE INDEX IF NOT EXISTS idx_assets_created_by_email
  ON public.assets (created_by_email);

ALTER TABLE public.consumables
  ADD COLUMN IF NOT EXISTS created_by_name text;

ALTER TABLE public.consumables
  ADD COLUMN IF NOT EXISTS created_by_email text;

CREATE INDEX IF NOT EXISTS idx_consumables_created_by_email
  ON public.consumables (created_by_email);

UPDATE public.assets
SET created_by_name = 'Bilal Ugurel'
WHERE created_by_name IS NULL
   OR btrim(created_by_name) = ''
   OR lower(btrim(created_by_name)) IN ('sistem', 'system');

UPDATE public.consumables
SET created_by_name = 'Bilal Ugurel'
WHERE created_by_name IS NULL
   OR btrim(created_by_name) = ''
   OR lower(btrim(created_by_name)) IN ('sistem', 'system');
