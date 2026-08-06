/*
# IT Asset Management Schema (Snipe-IT style)

1. Purpose
- A single-tenant IT asset tracking system to manage hardware assets, licenses, accessories, consumables, users, locations, manufacturers, categories, and asset checkout/checkin history.

2. New Tables
- `categories` — classification of assets (e.g. Laptops, Monitors, Phones). Columns: id, name, type (asset/license/accessory/consumable), color, created_at.
- `manufacturers` — makers of assets (e.g. Dell, Apple, HP). Columns: id, name, url, support_url, created_at.
- `locations` — physical locations where assets can reside. Columns: id, name, address, city, country, created_at.
- `users` — people who can be assigned assets (internal staff, not auth users). Columns: id, first_name, last_name, email, phone, job_title, employee_num, location_id, created_at.
- `assets` — the core inventory items. Columns: id, asset_tag, name, serial, model, manufacturer_id, category_id, default_location_id, assigned_to_id, status (ready/deployed/pending/broken/lost), purchase_date, purchase_cost, order_number, supplier, warranty_months, notes, image_url, created_at, updated_at.
- `accessories` — non-asset items that can be checked out (keyboards, mice, headsets). Columns: id, name, manufacturer_id, category_id, qty, remaining_qty, created_at.
- `consumables` — consumable items (toner, cables, batteries). Columns: id, name, manufacturer_id, category_id, qty, remaining_qty, created_at.
- `licenses` — software licenses. Columns: id, name, serial, manufacturer_id, category_id, seats, remaining_seats, expiration_date, purchase_cost, created_at.
- `checkout_history` — audit log of asset assignments. Columns: id, asset_id, accessory_id, consumable_id, license_id, assigned_to_id, action (checkout/checkin/audit), note, created_at.

3. Relationships
- assets -> categories, manufacturers, locations, users
- accessories -> categories, manufacturers
- consumables -> categories, manufacturers
- licenses -> categories, manufacturers
- checkout_history -> assets, accessories, consumables, licenses, users

4. Security
- RLS enabled on every table.
- Single-tenant (no auth screen): all policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` since the data is intentionally shared/public.
*/

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'asset' CHECK (type IN ('asset','license','accessory','consumable')),
  color text DEFAULT 'slate',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE TO anon, authenticated USING (true);

-- Manufacturers
CREATE TABLE IF NOT EXISTS manufacturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text,
  support_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_manufacturers" ON manufacturers;
CREATE POLICY "anon_select_manufacturers" ON manufacturers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_manufacturers" ON manufacturers;
CREATE POLICY "anon_insert_manufacturers" ON manufacturers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_manufacturers" ON manufacturers;
CREATE POLICY "anon_update_manufacturers" ON manufacturers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_manufacturers" ON manufacturers;
CREATE POLICY "anon_delete_manufacturers" ON manufacturers FOR DELETE TO anon, authenticated USING (true);

-- Locations
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  country text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_locations" ON locations;
CREATE POLICY "anon_select_locations" ON locations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_locations" ON locations;
CREATE POLICY "anon_insert_locations" ON locations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_locations" ON locations;
CREATE POLICY "anon_update_locations" ON locations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_locations" ON locations;
CREATE POLICY "anon_delete_locations" ON locations FOR DELETE TO anon, authenticated USING (true);

-- Users (internal staff, not auth users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  job_title text,
  employee_num text,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE TO anon, authenticated USING (true);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_tag text UNIQUE NOT NULL,
  name text NOT NULL,
  serial text,
  model text,
  manufacturer_id uuid REFERENCES manufacturers(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  default_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  assigned_to_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','deployed','pending','broken','lost')),
  purchase_date date,
  purchase_cost numeric(12,2),
  order_number text,
  supplier text,
  warranty_months int,
  notes text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_assets" ON assets;
CREATE POLICY "anon_select_assets" ON assets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_assets" ON assets;
CREATE POLICY "anon_insert_assets" ON assets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_assets" ON assets;
CREATE POLICY "anon_update_assets" ON assets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_assets" ON assets;
CREATE POLICY "anon_delete_assets" ON assets FOR DELETE TO anon, authenticated USING (true);

-- Accessories
CREATE TABLE IF NOT EXISTS accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  manufacturer_id uuid REFERENCES manufacturers(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  qty int NOT NULL DEFAULT 1,
  remaining_qty int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_accessories" ON accessories;
CREATE POLICY "anon_select_accessories" ON accessories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_accessories" ON accessories;
CREATE POLICY "anon_insert_accessories" ON accessories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_accessories" ON accessories;
CREATE POLICY "anon_update_accessories" ON accessories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_accessories" ON accessories;
CREATE POLICY "anon_delete_accessories" ON accessories FOR DELETE TO anon, authenticated USING (true);

-- Consumables
CREATE TABLE IF NOT EXISTS consumables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  manufacturer_id uuid REFERENCES manufacturers(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  qty int NOT NULL DEFAULT 1,
  remaining_qty int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_consumables" ON consumables;
CREATE POLICY "anon_select_consumables" ON consumables FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_consumables" ON consumables;
CREATE POLICY "anon_insert_consumables" ON consumables FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_consumables" ON consumables;
CREATE POLICY "anon_update_consumables" ON consumables FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_consumables" ON consumables;
CREATE POLICY "anon_delete_consumables" ON consumables FOR DELETE TO anon, authenticated USING (true);

-- Licenses
CREATE TABLE IF NOT EXISTS licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  serial text,
  manufacturer_id uuid REFERENCES manufacturers(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  seats int NOT NULL DEFAULT 1,
  remaining_seats int NOT NULL DEFAULT 1,
  expiration_date date,
  purchase_cost numeric(12,2),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_licenses" ON licenses;
CREATE POLICY "anon_select_licenses" ON licenses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_licenses" ON licenses;
CREATE POLICY "anon_insert_licenses" ON licenses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_licenses" ON licenses;
CREATE POLICY "anon_update_licenses" ON licenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_licenses" ON licenses;
CREATE POLICY "anon_delete_licenses" ON licenses FOR DELETE TO anon, authenticated USING (true);

-- Checkout history (audit log)
CREATE TABLE IF NOT EXISTS checkout_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  accessory_id uuid REFERENCES accessories(id) ON DELETE CASCADE,
  consumable_id uuid REFERENCES consumables(id) ON DELETE CASCADE,
  license_id uuid REFERENCES licenses(id) ON DELETE CASCADE,
  assigned_to_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('checkout','checkin','audit')),
  note text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE checkout_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_checkout_history" ON checkout_history;
CREATE POLICY "anon_select_checkout_history" ON checkout_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_checkout_history" ON checkout_history;
CREATE POLICY "anon_insert_checkout_history" ON checkout_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_checkout_history" ON checkout_history;
CREATE POLICY "anon_update_checkout_history" ON checkout_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_checkout_history" ON checkout_history;
CREATE POLICY "anon_delete_checkout_history" ON checkout_history FOR DELETE TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_asset_tag ON assets(asset_tag);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON assets(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_checkout_history_asset ON checkout_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_checkout_history_assigned_to ON checkout_history(assigned_to_id);

-- updated_at trigger for assets
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assets_updated_at ON assets;
CREATE TRIGGER assets_updated_at BEFORE UPDATE ON assets
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed data
INSERT INTO categories (name, type, color) VALUES
  ('Laptops', 'asset', 'blue'),
  ('Desktops', 'asset', 'cyan'),
  ('Monitors', 'asset', 'violet'),
  ('Phones', 'asset', 'amber'),
  ('Tablets', 'asset', 'pink'),
  ('Networking', 'asset', 'emerald'),
  ('Peripherals', 'accessory', 'slate'),
  ('Audio', 'accessory', 'rose'),
  ('Cables', 'consumable', 'orange'),
  ('Toner & Ink', 'consumable', 'red'),
  ('Software', 'license', 'indigo'),
  ('Operating Systems', 'license', 'teal')
ON CONFLICT DO NOTHING;

INSERT INTO manufacturers (name) VALUES
  ('Dell'),
  ('Apple'),
  ('HP'),
  ('Lenovo'),
  ('Cisco'),
  ('Microsoft'),
  ('Logitech'),
  ('Samsung')
ON CONFLICT DO NOTHING;

INSERT INTO locations (name, city, country) VALUES
  ('Main Office', 'Istanbul', 'Turkey'),
  ('Branch Office - Ankara', 'Ankara', 'Turkey'),
  ('Data Center', 'Izmir', 'Turkey'),
  ('Warehouse', 'Istanbul', 'Turkey')
ON CONFLICT DO NOTHING;

INSERT INTO users (first_name, last_name, email, job_title, employee_num) VALUES
  ('Ahmet', 'Yilmaz', 'ahmet.yilmaz@company.com', 'IT Manager', 'EMP-001'),
  ('Ayse', 'Kaya', 'ayse.kaya@company.com', 'Software Developer', 'EMP-002'),
  ('Mehmet', 'Demir', 'mehmet.demir@company.com', 'System Administrator', 'EMP-003'),
  ('Fatma', 'Celik', 'fatma.celik@company.com', 'Network Engineer', 'EMP-004'),
  ('Can', 'Ozturk', 'can.ozturk@company.com', 'DevOps Engineer', 'EMP-005')
ON CONFLICT DO NOTHING;
