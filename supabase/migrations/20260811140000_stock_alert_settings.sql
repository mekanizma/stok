/*
  Critical stock email alert settings + dedupe state
*/

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "admin_upsert_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "admin_update_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "admin_delete_app_settings" ON public.app_settings;

CREATE POLICY "staff_select_app_settings" ON public.app_settings
  FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "admin_insert_app_settings" ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_app_settings" ON public.app_settings
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_delete_app_settings" ON public.app_settings
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.stock_alert_state (
  item_type text NOT NULL CHECK (item_type IN ('accessory', 'consumable')),
  item_id uuid NOT NULL,
  item_name text NOT NULL,
  remaining_qty int NOT NULL,
  min_qty int NOT NULL,
  is_critical boolean NOT NULL DEFAULT true,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_type, item_id)
);

ALTER TABLE public.stock_alert_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select_stock_alert_state" ON public.stock_alert_state;
DROP POLICY IF EXISTS "writer_insert_stock_alert_state" ON public.stock_alert_state;
DROP POLICY IF EXISTS "writer_update_stock_alert_state" ON public.stock_alert_state;
DROP POLICY IF EXISTS "writer_delete_stock_alert_state" ON public.stock_alert_state;

CREATE POLICY "staff_select_stock_alert_state" ON public.stock_alert_state
  FOR SELECT TO authenticated USING (public.is_staff());

-- Writes happen via SECURITY DEFINER helper / service role in edge function
CREATE POLICY "admin_all_stock_alert_state" ON public.stock_alert_state
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.app_settings (key, value)
VALUES (
  'stock_alerts',
  jsonb_build_object(
    'enabled', false,
    'emails', jsonb_build_array(),
    'webhook_url', '',
    'from_email', 'Stok Uyarı <onboarding@resend.dev>',
    'cooldown_hours', 24
  )
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_critical_stock_items()
RETURNS TABLE (
  item_type text,
  item_id uuid,
  item_name text,
  remaining_qty int,
  min_qty int,
  total_qty int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'accessory'::text, a.id, a.name, a.remaining_qty, a.min_qty, a.qty
  FROM public.accessories a
  WHERE a.remaining_qty <= a.min_qty
  UNION ALL
  SELECT 'consumable'::text, c.id, c.name, c.remaining_qty, c.min_qty, c.qty
  FROM public.consumables c
  WHERE c.remaining_qty <= c.min_qty
  ORDER BY 1, 3;
$$;

REVOKE ALL ON FUNCTION public.get_critical_stock_items() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_critical_stock_items() TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_stock_alert_settings(p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emails jsonb;
  v_value jsonb;
BEGIN
  PERFORM public.require_admin();

  v_emails := coalesce(p_settings->'emails', '[]'::jsonb);
  IF jsonb_typeof(v_emails) = 'string' THEN
    v_emails := to_jsonb(string_to_array(trim(both '"' from v_emails::text), ','));
  END IF;

  v_value := jsonb_build_object(
    'enabled', coalesce((p_settings->>'enabled')::boolean, false),
    'emails', coalesce(v_emails, '[]'::jsonb),
    'webhook_url', coalesce(p_settings->>'webhook_url', ''),
    'from_email', coalesce(nullif(trim(p_settings->>'from_email'), ''), 'Stok Uyarı <onboarding@resend.dev>'),
    'cooldown_hours', greatest(1, least(168, coalesce((p_settings->>'cooldown_hours')::int, 24)))
  );

  INSERT INTO public.app_settings (key, value, updated_at, updated_by)
  VALUES ('stock_alerts', v_value, now(), public.current_user_email())
  ON CONFLICT (key) DO UPDATE SET
    value = excluded.value,
    updated_at = now(),
    updated_by = excluded.updated_by;

  RETURN v_value;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_stock_alert_settings(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_stock_alert_settings(jsonb) TO authenticated;

-- Mark notified / clear resolved (used by edge function via service role or admin)
CREATE OR REPLACE FUNCTION public.record_stock_alert_notifications(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_admin() AND NOT public.can_write_inventory() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  LOOP
    INSERT INTO public.stock_alert_state (
      item_type, item_id, item_name, remaining_qty, min_qty, is_critical, last_notified_at, updated_at
    ) VALUES (
      item->>'item_type',
      (item->>'item_id')::uuid,
      coalesce(item->>'item_name', ''),
      coalesce((item->>'remaining_qty')::int, 0),
      coalesce((item->>'min_qty')::int, 0),
      true,
      now(),
      now()
    )
    ON CONFLICT (item_type, item_id) DO UPDATE SET
      item_name = excluded.item_name,
      remaining_qty = excluded.remaining_qty,
      min_qty = excluded.min_qty,
      is_critical = true,
      last_notified_at = now(),
      updated_at = now();
  END LOOP;

  -- Clear alerts for items no longer critical
  UPDATE public.stock_alert_state s
  SET is_critical = false, updated_at = now()
  WHERE s.is_critical = true
    AND NOT EXISTS (
      SELECT 1 FROM public.get_critical_stock_items() c
      WHERE c.item_type = s.item_type AND c.item_id = s.item_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_stock_alert_notifications(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_stock_alert_notifications(jsonb) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_alert_state TO authenticated;
