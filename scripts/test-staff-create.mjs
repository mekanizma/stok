import pg from 'pg';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const url = 'https://osffdlhpanwboarjpluz.supabase.co';
const anon = 'sb_publishable_z06nHmu9u2hJfFpRTLFyCQ_ebyzPJ4a';
const dbPass = encodeURIComponent('Kaprencasper34');

// Login as admin
const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: anon, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@stoktakip.com', password: 'Kaprencasper34' }),
});
const loginJson = await login.json();
if (!login.ok) {
  console.error('admin login failed', loginJson);
  process.exit(1);
}
const token = loginJson.access_token;
console.log('admin logged in');

// Create staff via RPC
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
  }),
});
const rpcText = await rpc.text();
console.log('create_staff_user', rpc.status, rpcText);

// Login as new user with password 1
const userLogin = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: anon, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: testEmail, password: '1' }),
});
const userJson = await userLogin.json();
console.log('user login', userLogin.status, userJson.user?.user_metadata?.must_change_password);

// Cleanup test user
const client = new pg.Client({
  connectionString: `postgresql://postgres.osffdlhpanwboarjpluz:${dbPass}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
await client.query('delete from public.users where lower(email) = $1', [testEmail]);
await client.query('delete from auth.identities where user_id in (select id from auth.users where lower(email) = $1)', [testEmail]);
await client.query('delete from auth.users where lower(email) = $1', [testEmail]);
await client.end();
console.log('cleaned', testEmail);
