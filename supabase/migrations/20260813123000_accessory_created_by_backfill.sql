-- Backfill creator for accessories added before created_by tracking.
UPDATE public.accessories
SET created_by_name = 'Bilal Ugurel'
WHERE created_by_name IS NULL
   OR btrim(created_by_name) = ''
   OR lower(btrim(created_by_name)) IN ('sistem', 'system');
