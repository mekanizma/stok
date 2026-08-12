/*
  Optional serial number on accessories.
*/

ALTER TABLE public.accessories
  ADD COLUMN IF NOT EXISTS serial text;
