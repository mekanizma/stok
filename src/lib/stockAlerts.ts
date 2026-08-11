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
  from_email: 'Stok Uyarı <onboarding@resend.dev>',
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
  void supabase.functions.invoke('stock-alert', { body: { action } }).catch(() => {
    /* non-blocking */
  });
}

export async function invokeStockAlert(action: 'scan' | 'force' | 'test' | 'status') {
  const { data, error } = await supabase.functions.invoke('stock-alert', { body: { action } });
  if (error) {
    const msg = error.message || String(error);
    if (/failed to send a request to the edge function/i.test(msg) || /not found/i.test(msg)) {
      throw new Error(
        'stock-alert Edge Function bulunamadı. Supabase’de fonksiyonu deploy edin ve RESEND_API_KEY secret ekleyin.',
      );
    }
    throw error;
  }
  if (data?.error) throw new Error(String(data.error));
  return data as Record<string, unknown>;
}
