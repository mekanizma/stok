import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || 'Kaprencasper34');
const client = new pg.Client({
  connectionString: `postgresql://postgres.osffdlhpanwboarjpluz:${password}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const r = await client.query(`select instance_id from auth.users limit 1`);
console.log('instance_id', r.rows[0]?.instance_id);

const ext = await client.query(`select extname from pg_extension where extname in ('pgcrypto','supabase_vault')`);
console.log('extensions', ext.rows);

await client.end();
