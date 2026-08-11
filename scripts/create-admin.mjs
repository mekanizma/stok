import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD?.trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim();
const email = process.env.ADMIN_EMAIL?.trim() || 'admin@stoktakip.com';
const url = process.env.VITE_SUPABASE_URL?.trim();
const anon = process.env.VITE_SUPABASE_ANON_KEY?.trim();
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || 'osffdlhpanwboarjpluz';

if (!DB_PASSWORD || !ADMIN_PASSWORD || !url || !anon) {
  console.error('Gerekli env: SUPABASE_DB_PASSWORD, ADMIN_PASSWORD, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const signupRes = await fetch(`${url}/auth/v1/signup`, {
  method: 'POST',
  headers: {
    apikey: anon,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email,
    password: ADMIN_PASSWORD,
    data: { first_name: 'Admin', last_name: '', full_name: 'Admin' },
  }),
});
const signupBody = await signupRes.text();
console.log('signup', signupRes.status, signupBody.slice(0, 400));

const encoded = encodeURIComponent(DB_PASSWORD);
const client = new pg.Client({
  connectionString: `postgresql://postgres.${projectRef}:${encoded}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const existing = await client.query('select id, email, email_confirmed_at from auth.users where email = $1', [email]);
console.log('auth.users', existing.rows);

if (existing.rows.length === 0) {
  console.log('No user found after signup; check Auth settings.');
} else {
  await client.query(
    `update auth.users
     set email_confirmed_at = coalesce(email_confirmed_at, now()),
         raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || $2::jsonb,
         raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || $3::jsonb,
         updated_at = now()
     where email = $1`,
    [
      email,
      JSON.stringify({ app_role: 'admin' }),
      JSON.stringify({ first_name: 'Admin', last_name: '', full_name: 'Admin' }),
    ],
  );
  await client.query(
    `insert into public.users (first_name, last_name, email, app_role)
     values ('Admin', null, $1, 'admin')
     on conflict do nothing`,
    [email],
  );
  // If email unique isn't constrained, update existing row
  await client.query(
    `update public.users set app_role = 'admin' where lower(email) = lower($1)`,
    [email],
  );
  console.log('Admin confirmed');
}

const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    apikey: anon,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password: ADMIN_PASSWORD }),
});
const loginBody = await loginRes.text();
console.log('login', loginRes.status, loginBody.slice(0, 300));

await client.end();
