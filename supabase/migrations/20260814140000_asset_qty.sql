-- Demirbaş stok miktarı (aksesuar / sarf ile aynı model)
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS qty int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS remaining_qty int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_qty int NOT NULL DEFAULT 1;

UPDATE assets
SET remaining_qty = 0
WHERE status = 'deployed';
