import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.SUPABASE_DB_PASSWORD) {
  console.error('SUPABASE_DB_PASSWORD gerekli.');
  process.exit(1);
}
const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
const client = new pg.Client({
  connectionString: `postgresql://postgres.osffdlhpanwboarjpluz:${password}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260806141500_create_staff_user_auth.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

await client.connect();
await client.query(sql);
console.log('create_staff_user / delete_staff_user applied');
await client.end();
