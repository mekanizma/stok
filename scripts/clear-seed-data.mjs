import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || 'Kaprencasper34');
const client = new pg.Client({
  connectionString: `postgresql://postgres.osffdlhpanwboarjpluz:${password}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

// Remove all sample/seed operational data
await client.query('DELETE FROM checkout_history');
await client.query('DELETE FROM assets');
await client.query('DELETE FROM accessories');
await client.query('DELETE FROM consumables');
await client.query('DELETE FROM licenses');
await client.query('DELETE FROM users');

const tables = ['checkout_history', 'assets', 'accessories', 'consumables', 'licenses', 'users', 'categories', 'manufacturers', 'locations'];
for (const t of tables) {
  const r = await client.query(`select count(*)::int as n from public.${t}`);
  console.log(`${t}: ${r.rows[0].n}`);
}

await client.end();
console.log('Seed/mock operational data cleared.');
