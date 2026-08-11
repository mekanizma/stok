import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || 'Kaprencasper34';
const email = 'admin@stoktakip.com';
const password = 'Kaprencasper34';
const url = process.env.VITE_SUPABASE_URL || 'https://osffdlhpanwboarjpluz.supabase.co';
const anon = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_z06nHmu9u2hJfFpRTLFyCQ_ebyzPJ4a';

const signupRes = await fetch(`${url}/auth/v1/signup`, {
  method: 'POST',
  headers: {
    apikey: anon,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email,
    password,
    data: { first_name: 'Admin', last_name: '', full_name: 'Admin' },
  }),
});
const signupBody = await signupRes.text();
console.log('signup', signupRes.status, signupBody.slice(0, 400));

const encoded = encodeURIComponent(DB_PASSWORD);
const client = new pg.Client({
  connectionString: `postgresql://postgres.osffdlhpanwboarjpluz:${encoded}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const existing = await client.query('select id, email, email_confirmed_at from auth.users where email = $1', [email]);
console.log('auth.users', existing.rows);

if (existing.rows.length === 0) {
  // Fallback: create via extension if signup failed
  console.log('No user found after signup; check Auth settings.');
} else {
  await client.query(
    `update auth.users
     set email_confirmed_at = coalesce(email_confirmed_at, now()),
         raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || $2::jsonb,
         updated_at = now()
     where email = $1`,
    [email, JSON.stringify({ first_name: 'Admin', last_name: '', full_name: 'Admin', role: 'admin' })]
  );
  console.log('Admin confirmed');
}

// Verify password login
const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    apikey: anon,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
});
const loginBody = await loginRes.text();
console.log('login', loginRes.status, loginBody.slice(0, 300));

await client.end();
