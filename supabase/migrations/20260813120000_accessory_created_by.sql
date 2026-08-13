-- Who created each accessory (staff display name from auth session).
ALTER TABLE public.accessories
  ADD COLUMN IF NOT EXISTS created_by_name text;

ALTER TABLE public.accessories
  ADD COLUMN IF NOT EXISTS created_by_email text;

CREATE INDEX IF NOT EXISTS idx_accessories_created_by_email
  ON public.accessories (created_by_email);

-- Existing rows were entered by Bilal Ugurel before tracking existed.
UPDATE public.accessories
SET created_by_name = 'Bilal Ugurel'
WHERE created_by_name IS NULL
   OR btrim(created_by_name) = '';

