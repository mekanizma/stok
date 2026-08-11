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

const cols = await client.query(`
  select column_name, data_type
  from information_schema.columns
  where table_schema='auth' and table_name='users'
  order by ordinal_position
`);
console.log('--- auth.users ---');
for (const r of cols.rows) console.log(r.column_name, r.data_type);

const idcols = await client.query(`
  select column_name, data_type
  from information_schema.columns
  where table_schema='auth' and table_name='identities'
  order by ordinal_position
`);
console.log('--- auth.identities ---');
for (const r of idcols.rows) console.log(r.column_name, r.data_type);

const sample = await client.query(`
  select id, email, raw_user_meta_data, raw_app_meta_data
  from auth.users limit 1
`);
console.log('sample user', JSON.stringify(sample.rows[0], null, 2));

const ident = await client.query(`select * from auth.identities limit 1`);
console.log('sample identity', JSON.stringify(ident.rows[0], null, 2));

await client.end();
