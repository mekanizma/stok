/*
  Idempotent fix: ensure stock-alert policies can be re-applied safely.
  Safe to run if 20260811140000 partially applied.
*/

DROP POLICY IF EXISTS "staff_select_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "admin_upsert_app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "admin_insert_app_settings" ON public.app_settings;
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

DROP POLICY IF EXISTS "staff_select_stock_alert_state" ON public.stock_alert_state;
DROP POLICY IF EXISTS "writer_insert_stock_alert_state" ON public.stock_alert_state;
DROP POLICY IF EXISTS "writer_update_stock_alert_state" ON public.stock_alert_state;
DROP POLICY IF EXISTS "writer_delete_stock_alert_state" ON public.stock_alert_state;
DROP POLICY IF EXISTS "admin_all_stock_alert_state" ON public.stock_alert_state;

CREATE POLICY "staff_select_stock_alert_state" ON public.stock_alert_state
  FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "admin_all_stock_alert_state" ON public.stock_alert_state
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
