/**
 * Apply a single SQL migration file to remote Supabase.
 * Usage:
 *   set SUPABASE_DB_PASSWORD=...
 *   node scripts/apply-migration.mjs supabase/migrations/20260811130000_secure_rls_and_roles.sql
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const password = process.env.SUPABASE_DB_PASSWORD?.trim();
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || 'osffdlhpanwboarjpluz';
const sqlArg = process.argv[2];

if (!password) {
  console.error('SUPABASE_DB_PASSWORD gerekli.');
  process.exit(1);
}
if (!sqlArg) {
  console.error('Kullanım: node scripts/apply-migration.mjs <path-to.sql>');
  process.exit(1);
}

const sqlPath = path.isAbsolute(sqlArg) ? sqlArg : path.join(root, sqlArg);
const sql = fs.readFileSync(sqlPath, 'utf8');
const encoded = encodeURIComponent(password);

const hosts = [
  `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`,
  `postgresql://postgres.${projectRef}:${encoded}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${encoded}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${encoded}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
];

let client;
let lastError;
for (const connectionString of hosts) {
  const label = connectionString.replace(encoded, '***').split('@')[1];
  const c = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await c.connect();
    console.log('Connected:', label);
    client = c;
    break;
  } catch (err) {
    lastError = err;
    console.log('Skip:', label, '-', err.message);
    try { await c.end(); } catch { /* ignore */ }
  }
}

if (!client) throw lastError;

try {
  await client.query(sql);
  console.log('Applied:', path.relative(root, sqlPath));
} finally {
  await client.end();
}
