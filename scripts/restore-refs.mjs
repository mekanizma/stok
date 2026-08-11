import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

if (!process.env.SUPABASE_DB_PASSWORD) {
  console.error('SUPABASE_DB_PASSWORD gerekli.');
  process.exit(1);
}
const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
const client = new pg.Client({
  connectionString: `postgresql://postgres.osffdlhpanwboarjpluz:${password}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const counts = {};
for (const t of ['categories', 'manufacturers', 'locations', 'users', 'assets', 'checkout_history', 'accessories', 'consumables', 'licenses']) {
  const r = await client.query(`select count(*)::int as n from public.${t}`);
  counts[t] = r.rows[0].n;
}
console.log('before', counts);

if (counts.locations === 0) {
  await client.query(`
    INSERT INTO locations (name, city, country) VALUES
      ('Main Office', 'Istanbul', 'Turkey'),
      ('Branch Office - Ankara', 'Ankara', 'Turkey'),
      ('Data Center', 'Izmir', 'Turkey'),
      ('Warehouse', 'Istanbul', 'Turkey')
  `);
  console.log('locations restored');
}

if (counts.manufacturers === 0) {
  await client.query(`
    INSERT INTO manufacturers (name) VALUES
      ('Dell'), ('Apple'), ('HP'), ('Lenovo'), ('Cisco'), ('Microsoft'), ('Logitech'), ('Samsung')
  `);
  console.log('manufacturers restored');
}

if (counts.categories === 0) {
  await client.query(`
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
  `);
  console.log('categories restored');
}

for (const t of Object.keys(counts)) {
  const r = await client.query(`select count(*)::int as n from public.${t}`);
  counts[t] = r.rows[0].n;
}
console.log('after', counts);
await client.end();
