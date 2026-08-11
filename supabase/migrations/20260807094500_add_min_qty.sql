/*
# Add low-stock threshold to accessories and consumables
*/

ALTER TABLE accessories
  ADD COLUMN IF NOT EXISTS min_qty int NOT NULL DEFAULT 1;

ALTER TABLE consumables
  ADD COLUMN IF NOT EXISTS min_qty int NOT NULL DEFAULT 1;
