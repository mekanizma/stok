import { supabase } from '@/lib/supabase';

export interface StockAlertSettings {
  enabled: boolean;
  emails: string[];
  webhook_url: string;
  from_email: string;
  cooldown_hours: number;
}

export const DEFAULT_STOCK_ALERT_SETTINGS: StockAlertSettings = {
  enabled: false,
  emails: [],
  webhook_url: '',
  from_email: 'envanter@e-final.com',
  cooldown_hours: 24,
};

export function parseEmailList(input: string): string[] {
  return input
    .split(/[,;\n]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

export async function loadStockAlertSettings(): Promise<StockAlertSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'stock_alerts')
    .maybeSingle();
  if (error || !data?.value) return { ...DEFAULT_STOCK_ALERT_SETTINGS };
  const v = data.value as Record<string, unknown>;
  return {
    enabled: Boolean(v.enabled),
    emails: Array.isArray(v.emails)
      ? v.emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
      : parseEmailList(String(v.emails || '')),
    webhook_url: String(v.webhook_url || ''),
    from_email: String(v.from_email || DEFAULT_STOCK_ALERT_SETTINGS.from_email),
    cooldown_hours: Number(v.cooldown_hours || 24) || 24,
  };
}

export async function saveStockAlertSettings(settings: StockAlertSettings) {
  const { data, error } = await supabase.rpc('upsert_stock_alert_settings', {
    p_settings: settings,
  });
  if (error) throw error;
  return data as StockAlertSettings;
}

/** Fire-and-forget critical stock scan after inventory changes. */
export function notifyCriticalStock(action: 'scan' | 'force' | 'test' | 'status' = 'scan') {
  void invokeStockAlert(action).catch(() => {
    /* non-blocking */
  });
}

export async function invokeStockAlert(action: 'scan' | 'force' | 'test' | 'status') {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session?.access_token) {
    throw new Error('Oturum bulunamadı. Tekrar giriş yapın.');
  }

  const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (!baseUrl || !anonKey) {
    throw new Error('Supabase yapılandırması eksik.');
  }

  const res = await fetch(`${baseUrl}/functions/v1/stock-alert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ action }),
  });

  const text = await res.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    payload = { raw: text };
  }

  if (!res.ok) {
    const detail = String(payload.error || payload.message || payload.raw || text || res.statusText || res.status);
    throw new Error(detail);
  }
  if (payload.error) throw new Error(String(payload.error));
  return payload;
}
