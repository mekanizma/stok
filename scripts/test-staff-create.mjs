import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const url = process.env.VITE_SUPABASE_URL?.trim();
const anon = process.env.VITE_SUPABASE_ANON_KEY?.trim();
const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'admin@stoktakip.com';
const adminPassword = process.env.ADMIN_PASSWORD?.trim();
const dbPassword = process.env.SUPABASE_DB_PASSWORD?.trim();
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || 'osffdlhpanwboarjpluz';

if (!url || !anon || !adminPassword || !dbPassword) {
  console.error('Gerekli env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ADMIN_PASSWORD, SUPABASE_DB_PASSWORD');
  process.exit(1);
}

const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: anon, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: adminEmail, password: adminPassword }),
});
const loginJson = await login.json();
if (!login.ok) {
  console.error('admin login failed', loginJson);
  process.exit(1);
}
const token = loginJson.access_token;
console.log('admin logged in');

const testEmail = `test.user.${Date.now()}@stoktakip.com`;
const rpc = await fetch(`${url}/rest/v1/rpc/create_staff_user`, {
  method: 'POST',
  headers: {
    apikey: anon,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    p_first_name: 'Test',
    p_last_name: 'User',
    p_email: testEmail,
    p_phone: null,
    p_job_title: 'Staff',
    p_employee_num: null,
    p_location_id: null,
    p_role: 'it',
  }),
});
const rpcText = await rpc.text();
console.log('create_staff_user', rpc.status, rpcText);

const userLogin = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: anon, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: testEmail, password: '1' }),
});
const userJson = await userLogin.json();
console.log('user login', userLogin.status, userJson.user?.user_metadata?.must_change_password);

const dbPass = encodeURIComponent(dbPassword);
const client = new pg.Client({
  connectionString: `postgresql://postgres.${projectRef}:${dbPass}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
await client.query('delete from public.users where lower(email) = $1', [testEmail]);
await client.query('delete from auth.identities where user_id in (select id from auth.users where lower(email) = $1)', [testEmail]);
await client.query('delete from auth.users where lower(email) = $1', [testEmail]);
await client.end();
console.log('cleaned', testEmail);
