/**
 * Applies schema + seed SQL to the remote Supabase Postgres database.
 * Usage:
 *   set SUPABASE_DB_PASSWORD=your-db-password
 *   node scripts/apply-schema.mjs
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
const projectRef = 'osffdlhpanwboarjpluz';

if (!password) {
  console.error('SUPABASE_DB_PASSWORD eksik. Supabase Dashboard > Project Settings > Database şifresini kullanın.');
  process.exit(1);
}

const encoded = encodeURIComponent(password);
const regions = [
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-north-1',
  'us-east-1',
  'us-west-1',
  'ap-southeast-1',
  'ap-northeast-1',
];

const hosts = [
  `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`,
  ...regions.flatMap((region) => [
    `postgresql://postgres.${projectRef}:${encoded}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${encoded}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${projectRef}:${encoded}@aws-1-${region}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${encoded}@aws-1-${region}.pooler.supabase.com:6543/postgres`,
  ]),
];

const migrationsDir = path.join(root, 'supabase', 'migrations');
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

async function connect() {
  let lastError;
  for (const connectionString of hosts) {
    const label = connectionString.replace(encoded, '***').split('@')[1];
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      console.log('Connected:', label);
      return client;
    } catch (err) {
      lastError = err;
      console.log('Skip:', label, '-', err.message);
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  throw lastError;
}

const client = await connect();
try {
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Applying ${file}...`);
    await client.query(sql);
    console.log(`OK ${file}`);
  }
  console.log('Schema + seed applied successfully.');
} finally {
  await client.end();
}
