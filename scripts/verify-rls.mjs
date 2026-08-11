import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

if (!process.env.SUPABASE_DB_PASSWORD) {
  console.error('SUPABASE_DB_PASSWORD gerekli.');
  process.exit(1);
}

const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
const projectRef = process.env.SUPABASE_PROJECT_REF || 'osffdlhpanwboarjpluz';
const client = new pg.Client({
  connectionString: `postgresql://postgres.${projectRef}:${password}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const policies = await client.query(`
  select tablename, policyname, cmd, roles::text as roles
  from pg_policies
  where schemaname = 'public'
  order by tablename, policyname
`);
console.log('policy_count', policies.rowCount);
for (const r of policies.rows) {
  console.log(`${r.tablename} | ${r.cmd} | ${r.policyname} | ${r.roles}`);
}

const anonAssets = await client.query(`
  select privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'assets' and grantee = 'anon'
`);
console.log('anon_asset_grants', anonAssets.rows);

const helpers = await client.query(`
  select p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('is_admin', 'is_staff', 'current_app_role', 'require_admin', 'can_write_inventory')
  order by p.proname
`);
console.log('helpers', helpers.rows.map((r) => r.proname));

await client.end();
