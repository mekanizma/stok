import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CriticalItem = {
  item_type: 'accessory' | 'consumable';
  item_id: string;
  item_name: string;
  remaining_qty: number;
  min_qty: number;
  total_qty: number;
};

type StockAlertSettings = {
  enabled: boolean;
  emails: string[];
  webhook_url: string;
  from_email: string;
  cooldown_hours: number;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseEmails(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((e) => String(e).trim().toLowerCase()).filter((e) => e.includes('@'));
  }
  if (typeof raw === 'string') {
    return raw.split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@'));
  }
  return [];
}

function buildEmailHtml(items: CriticalItem[]) {
  const rows = items.map((i) => {
    const kind = i.item_type === 'accessory' ? 'Aksesuar' : 'Sarf';
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${kind}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${i.item_name}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${i.remaining_qty}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${i.min_qty}</td>
    </tr>`;
  }).join('');

  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;color:#111827;">
    <h2 style="margin:0 0 8px;">Kritik Stok Uyarısı</h2>
    <p style="margin:0 0 16px;color:#4b5563;">Aşağıdaki kalemler düşük stok eşiğinin altına düştü.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f9fafb;text-align:left;">
          <th style="padding:8px;">Tür</th>
          <th style="padding:8px;">Ürün</th>
          <th style="padding:8px;text-align:right;">Kalan</th>
          <th style="padding:8px;text-align:right;">Eşik</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Final Üniversitesi Bilgi İşlem — Stok Takip</p>
  </div>`;
}

async function sendResend(opts: {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body?.message || body?.error || JSON.stringify(body) || `Resend error ${res.status}`;
    throw new Error(String(detail));
  }
  return body;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
    const resendKey = Deno.env.get('RESEND_API_KEY') || '';

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json({ error: 'Supabase ortam değişkenleri eksik (URL / ANON / SERVICE_ROLE).' }, 500);
    }

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return json({ error: 'Authorization header gerekli.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: `Unauthorized: ${userErr?.message || 'oturum geçersiz'}` }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = String(body.action || 'scan');

    const { data: settingRow, error: settingErr } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'stock_alerts')
      .maybeSingle();
    if (settingErr) throw settingErr;

    const raw = (settingRow?.value || {}) as Record<string, unknown>;
    const settings: StockAlertSettings = {
      enabled: Boolean(raw.enabled),
      emails: parseEmails(raw.emails),
      webhook_url: String(raw.webhook_url || '').trim(),
      from_email: String(raw.from_email || 'Stok Uyarı <onboarding@resend.dev>'),
      cooldown_hours: Number(raw.cooldown_hours || 24),
    };

    const { data: criticalRows, error: critErr } = await admin.rpc('get_critical_stock_items');
    if (critErr) throw critErr;
    const critical = (criticalRows || []) as CriticalItem[];

    if (action === 'status') {
      return json({
        enabled: settings.enabled,
        emailCount: settings.emails.length,
        hasWebhook: Boolean(settings.webhook_url),
        hasResendKey: Boolean(resendKey),
        criticalCount: critical.length,
        critical,
      });
    }

    if (action === 'test') {
      if (!settings.emails.length && !settings.webhook_url) {
        return json({ error: 'Alıcı e-posta veya webhook tanımlayın.' }, 400);
      }
      const sample = critical.length
        ? critical
        : [{
            item_type: 'consumable' as const,
            item_id: '00000000-0000-0000-0000-000000000000',
            item_name: 'Test Ürün',
            remaining_qty: 0,
            min_qty: 1,
            total_qty: 10,
          }];

      const results: Record<string, unknown> = {};
      if (settings.emails.length) {
        if (!resendKey) {
          return json({ error: 'RESEND_API_KEY Edge Function secret olarak eklenmeli.' }, 400);
        }
        results.resend = await sendResend({
          apiKey: resendKey,
          from: settings.from_email,
          to: settings.emails,
          subject: `[TEST] Kritik Stok Uyarısı (${sample.length})`,
          html: buildEmailHtml(sample),
        });
      }
      if (settings.webhook_url) {
        const wh = await fetch(settings.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'stock_alert_test', items: sample, at: new Date().toISOString() }),
        });
        results.webhook = { status: wh.status };
      }
      return json({ ok: true, results });
    }

    // scan / notify
    if (!settings.enabled && action !== 'force') {
      return json({ ok: true, skipped: true, reason: 'disabled', criticalCount: critical.length });
    }
    if (!critical.length) {
      await admin.rpc('record_stock_alert_notifications', { p_items: [] });
      return json({ ok: true, sent: false, reason: 'no_critical' });
    }

    const { data: states } = await admin.from('stock_alert_state').select('*');
    const stateMap = new Map(
      (states || []).map((s: { item_type: string; item_id: string; last_notified_at: string | null; is_critical: boolean }) => [
        `${s.item_type}:${s.item_id}`,
        s,
      ]),
    );

    const cooldownMs = Math.max(1, settings.cooldown_hours) * 60 * 60 * 1000;
    const now = Date.now();
    const toNotify = critical.filter((item) => {
      const prev = stateMap.get(`${item.item_type}:${item.item_id}`);
      if (!prev || !prev.last_notified_at || !prev.is_critical) return true;
      return now - new Date(prev.last_notified_at).getTime() >= cooldownMs;
    });

    if (!toNotify.length) {
      return json({ ok: true, sent: false, reason: 'cooldown', criticalCount: critical.length });
    }

    if (!settings.emails.length && !settings.webhook_url) {
      return json({ error: 'Alıcı e-posta veya webhook tanımlayın.', criticalCount: critical.length }, 400);
    }

    const results: Record<string, unknown> = {};
    if (settings.emails.length) {
      if (!resendKey) {
        return json({ error: 'RESEND_API_KEY Edge Function secret olarak eklenmeli.' }, 400);
      }
      results.resend = await sendResend({
        apiKey: resendKey,
        from: settings.from_email,
        to: settings.emails,
        subject: `Kritik Stok Uyarısı (${toNotify.length} kalem)`,
        html: buildEmailHtml(toNotify),
      });
    }
    if (settings.webhook_url) {
      const wh = await fetch(settings.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'stock_alert', items: toNotify, at: new Date().toISOString() }),
      });
      results.webhook = { status: wh.status };
    }

    await admin.rpc('record_stock_alert_notifications', {
      p_items: toNotify.map((i) => ({
        item_type: i.item_type,
        item_id: i.item_id,
        item_name: i.item_name,
        remaining_qty: i.remaining_qty,
        min_qty: i.min_qty,
      })),
    });

    return json({ ok: true, sent: true, count: toNotify.length, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
