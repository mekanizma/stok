import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || 'Kaprencasper34');
const client = new pg.Client({
  connectionString: `postgresql://postgres.osffdlhpanwboarjpluz:${password}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260811110000_allow_admin_role.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

await client.connect();
await client.query(sql);
console.log('admin role migration applied');
await client.end();
