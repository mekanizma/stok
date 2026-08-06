/*
# Seed sample assets, accessories, consumables, and licenses

1. Purpose
- Populate the database with realistic sample data so the app demonstrates full functionality on first load.

2. Data Added
- 8 sample assets (laptops, monitors, phones, networking gear) with various statuses
- 3 accessories (keyboard, mouse, headset)
- 2 consumables (USB-C cable, toner cartridge)
- 2 software licenses (Microsoft 365, Adobe Creative Cloud)
*/

INSERT INTO assets (asset_tag, name, serial, model, manufacturer_id, category_id, default_location_id, assigned_to_id, status, purchase_date, purchase_cost, warranty_months, notes)
SELECT 'AST-0001', 'MacBook Pro 16"', 'C02XL0ZIJGH', 'MacBook Pro 16 M3 Pro', m.id, c.id, l.id, u.id, 'deployed', '2024-01-15', 3200.00, 36, 'Primary development laptop'
FROM manufacturers m, categories c, locations l, users u
WHERE m.name='Apple' AND c.name='Laptops' AND l.name='Main Office' AND u.first_name='Ayse'
LIMIT 1;

INSERT INTO assets (asset_tag, name, serial, model, manufacturer_id, category_id, default_location_id, assigned_to_id, status, purchase_date, purchase_cost, warranty_months)
SELECT 'AST-0002', 'Dell Latitude 7440', 'DL7440X91', 'Latitude 7440', m.id, c.id, l.id, u.id, 'deployed', '2024-03-10', 1800.00, 36
FROM manufacturers m, categories c, locations l, users u
WHERE m.name='Dell' AND c.name='Laptops' AND l.name='Main Office' AND u.first_name='Mehmet'
LIMIT 1;

INSERT INTO assets (asset_tag, name, serial, model, manufacturer_id, category_id, default_location_id, status, purchase_date, purchase_cost, warranty_months)
SELECT 'AST-0003', 'Dell U2723QE Monitor', 'DLLU2723QE55', 'U2723QE 27" 4K', m.id, c.id, l.id, 'ready', '2024-02-20', 650.00, 36
FROM manufacturers m, categories c, locations l
WHERE m.name='Dell' AND c.name='Monitors' AND l.name='Main Office'
LIMIT 1;

INSERT INTO assets (asset_tag, name, serial, model, manufacturer_id, category_id, default_location_id, assigned_to_id, status, purchase_date, purchase_cost, warranty_months)
SELECT 'AST-0004', 'iPhone 15 Pro', 'IP15PRO128', 'iPhone 15 Pro 128GB', m.id, c.id, l.id, u.id, 'deployed', '2024-01-05', 1200.00, 24
FROM manufacturers m, categories c, locations l, users u
WHERE m.name='Apple' AND c.name='Phones' AND l.name='Main Office' AND u.first_name='Ahmet'
LIMIT 1;

INSERT INTO assets (asset_tag, name, serial, model, manufacturer_id, category_id, default_location_id, status, purchase_date, purchase_cost, warranty_months)
SELECT 'AST-0005', 'Cisco Catalyst 9300', 'C930048T', 'Catalyst 9300-48T', m.id, c.id, l.id, 'ready', '2023-11-15', 8500.00, 60
FROM manufacturers m, categories c, locations l
WHERE m.name='Cisco' AND c.name='Networking' AND l.name='Data Center'
LIMIT 1;

INSERT INTO assets (asset_tag, name, serial, model, manufacturer_id, category_id, default_location_id, assigned_to_id, status, purchase_date, purchase_cost, warranty_months)
SELECT 'AST-0006', 'Lenovo ThinkPad X1 Carbon', 'LENOX1C12', 'ThinkPad X1 Carbon Gen 11', m.id, c.id, l.id, u.id, 'deployed', '2024-04-01', 2100.00, 36
FROM manufacturers m, categories c, locations l, users u
WHERE m.name='Lenovo' AND c.name='Laptops' AND l.name='Main Office' AND u.first_name='Fatma'
LIMIT 1;

INSERT INTO assets (asset_tag, name, serial, model, manufacturer_id, category_id, default_location_id, status, purchase_date, purchase_cost, warranty_months)
SELECT 'AST-0007', 'Samsung Odyssey G7', 'SAMOYG27', 'Odyssey G7 27" QHD', m.id, c.id, l.id, 'pending', '2024-05-10', 550.00, 24
FROM manufacturers m, categories c, locations l
WHERE m.name='Samsung' AND c.name='Monitors' AND l.name='Warehouse'
LIMIT 1;

INSERT INTO assets (asset_tag, name, serial, model, manufacturer_id, category_id, default_location_id, status, purchase_date, purchase_cost, warranty_months, notes)
SELECT 'AST-0008', 'HP ProDesk 600 G6', 'HPPD600G6', 'ProDesk 600 G6 DM', m.id, c.id, l.id, 'broken', '2023-06-20', 950.00, 36, 'Screen flickering - sent for repair'
FROM manufacturers m, categories c, locations l
WHERE m.name='HP' AND c.name='Desktops' AND l.name='Main Office'
LIMIT 1;

INSERT INTO accessories (name, manufacturer_id, category_id, qty, remaining_qty)
SELECT 'Logitech MX Master 3S', m.id, c.id, 10, 7
FROM manufacturers m, categories c WHERE m.name='Logitech' AND c.name='Peripherals' LIMIT 1;

INSERT INTO accessories (name, manufacturer_id, category_id, qty, remaining_qty)
SELECT 'Logitech MX Keys', m.id, c.id, 8, 5
FROM manufacturers m, categories c WHERE m.name='Logitech' AND c.name='Peripherals' LIMIT 1;

INSERT INTO accessories (name, manufacturer_id, category_id, qty, remaining_qty)
SELECT 'Sony WH-1000XM5', m.id, c.id, 5, 3
FROM manufacturers m, categories c WHERE m.name='Apple' AND c.name='Audio' LIMIT 1;

INSERT INTO consumables (name, manufacturer_id, category_id, qty, remaining_qty)
SELECT 'USB-C Cable 2m', m.id, c.id, 50, 32
FROM manufacturers m, categories c WHERE m.name='Apple' AND c.name='Cables' LIMIT 1;

INSERT INTO consumables (name, manufacturer_id, category_id, qty, remaining_qty)
SELECT 'HP 414A Black Toner', m.id, c.id, 20, 8
FROM manufacturers m, categories c WHERE m.name='HP' AND c.name='Toner & Ink' LIMIT 1;

INSERT INTO licenses (name, serial, manufacturer_id, category_id, seats, remaining_seats, expiration_date, purchase_cost)
SELECT 'Microsoft 365 Business Standard', 'M365BS-2024', m.id, c.id, 25, 12, '2025-12-31', 1500.00
FROM manufacturers m, categories c WHERE m.name='Microsoft' AND c.name='Software' LIMIT 1;

INSERT INTO licenses (name, serial, manufacturer_id, category_id, seats, remaining_seats, expiration_date, purchase_cost)
SELECT 'Adobe Creative Cloud All Apps', 'ACC-2024-TEAM', m.id, c.id, 10, 4, '2025-08-15', 5400.00
FROM manufacturers m, categories c WHERE m.name='Microsoft' AND c.name='Software' LIMIT 1;

-- Checkout history for deployed assets
INSERT INTO checkout_history (asset_id, assigned_to_id, action, note)
SELECT a.id, a.assigned_to_id, 'checkout', 'Initial deployment'
FROM assets a WHERE a.assigned_to_id IS NOT NULL;
