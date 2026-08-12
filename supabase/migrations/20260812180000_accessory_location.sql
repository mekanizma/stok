/*
  Optional location on accessories.
*/

ALTER TABLE public.accessories
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_accessories_location
  ON public.accessories (location_id);
