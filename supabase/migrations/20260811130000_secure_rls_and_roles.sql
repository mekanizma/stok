/*
  Harden RLS + staff RPCs (safe additive migration)

  - Block anon completely (login required)
  - Authorize from public.users.app_role (not forgeable user_metadata)
  - HR: SELECT only
  - IT: write inventory (not users/locations)
  - Admin: full write + staff RPCs
  - Audit log: insert-only for writers; no update/delete via client
*/

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so policies can read users without recursion)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := public.current_user_email();
  v_role text;
BEGIN
  IF auth.uid() IS NULL OR v_email = '' THEN
    RETURN NULL;
  END IF;

  IF v_email = 'admin@stoktakip.com' THEN
    RETURN 'admin';
  END IF;

  SELECT u.app_role INTO v_role
  FROM public.users u
  WHERE lower(u.email) = v_email
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL; -- authenticated but not a staff row
  END IF;

  RETURN coalesce(nullif(trim(v_role), ''), 'it');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_app_role() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_app_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.can_write_inventory()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_app_role() IN ('admin', 'it');
$$;

CREATE OR REPLACE FUNCTION public.require_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_write_inventory() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.require_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_inventory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- Drop legacy open policies
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'categories', 'manufacturers', 'locations', 'users', 'assets',
        'accessories', 'consumables', 'licenses', 'checkout_history'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Grants: anon locked out; authenticated keeps table access (RLS enforces)
-- ---------------------------------------------------------------------------

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- categories
CREATE POLICY "staff_select_categories" ON public.categories
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "writer_insert_categories" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (public.can_write_inventory());
CREATE POLICY "writer_update_categories" ON public.categories
  FOR UPDATE TO authenticated USING (public.can_write_inventory()) WITH CHECK (public.can_write_inventory());
CREATE POLICY "writer_delete_categories" ON public.categories
  FOR DELETE TO authenticated USING (public.can_write_inventory());

-- manufacturers
CREATE POLICY "staff_select_manufacturers" ON public.manufacturers
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "writer_insert_manufacturers" ON public.manufacturers
  FOR INSERT TO authenticated WITH CHECK (public.can_write_inventory());
CREATE POLICY "writer_update_manufacturers" ON public.manufacturers
  FOR UPDATE TO authenticated USING (public.can_write_inventory()) WITH CHECK (public.can_write_inventory());
CREATE POLICY "writer_delete_manufacturers" ON public.manufacturers
  FOR DELETE TO authenticated USING (public.can_write_inventory());

-- locations: admin write only (IT/HR read)
CREATE POLICY "staff_select_locations" ON public.locations
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "admin_insert_locations" ON public.locations
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin_update_locations" ON public.locations
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_delete_locations" ON public.locations
  FOR DELETE TO authenticated USING (public.is_admin());

-- users: staff can read; writes only via SECURITY DEFINER RPCs
CREATE POLICY "staff_select_users" ON public.users
  FOR SELECT TO authenticated USING (public.is_staff());

-- assets
CREATE POLICY "staff_select_assets" ON public.assets
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "writer_insert_assets" ON public.assets
  FOR INSERT TO authenticated WITH CHECK (public.can_write_inventory());
CREATE POLICY "writer_update_assets" ON public.assets
  FOR UPDATE TO authenticated USING (public.can_write_inventory()) WITH CHECK (public.can_write_inventory());
CREATE POLICY "writer_delete_assets" ON public.assets
  FOR DELETE TO authenticated USING (public.can_write_inventory());

-- accessories
CREATE POLICY "staff_select_accessories" ON public.accessories
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "writer_insert_accessories" ON public.accessories
  FOR INSERT TO authenticated WITH CHECK (public.can_write_inventory());
CREATE POLICY "writer_update_accessories" ON public.accessories
  FOR UPDATE TO authenticated USING (public.can_write_inventory()) WITH CHECK (public.can_write_inventory());
CREATE POLICY "writer_delete_accessories" ON public.accessories
  FOR DELETE TO authenticated USING (public.can_write_inventory());

-- consumables
CREATE POLICY "staff_select_consumables" ON public.consumables
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "writer_insert_consumables" ON public.consumables
  FOR INSERT TO authenticated WITH CHECK (public.can_write_inventory());
CREATE POLICY "writer_update_consumables" ON public.consumables
  FOR UPDATE TO authenticated USING (public.can_write_inventory()) WITH CHECK (public.can_write_inventory());
CREATE POLICY "writer_delete_consumables" ON public.consumables
  FOR DELETE TO authenticated USING (public.can_write_inventory());

-- licenses
CREATE POLICY "staff_select_licenses" ON public.licenses
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "writer_insert_licenses" ON public.licenses
  FOR INSERT TO authenticated WITH CHECK (public.can_write_inventory());
CREATE POLICY "writer_update_licenses" ON public.licenses
  FOR UPDATE TO authenticated USING (public.can_write_inventory()) WITH CHECK (public.can_write_inventory());
CREATE POLICY "writer_delete_licenses" ON public.licenses
  FOR DELETE TO authenticated USING (public.can_write_inventory());

-- checkout_history: staff read; writers insert; no client update/delete
CREATE POLICY "staff_select_checkout_history" ON public.checkout_history
  FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "writer_insert_checkout_history" ON public.checkout_history
  FOR INSERT TO authenticated WITH CHECK (public.can_write_inventory());

-- ---------------------------------------------------------------------------
-- Staff RPCs: admin only + keep role source of truth in public.users
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_staff_user(
  p_first_name text,
  p_last_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_job_title text DEFAULT NULL,
  p_employee_num text DEFAULT NULL,
  p_location_id uuid DEFAULT NULL,
  p_role text DEFAULT 'it'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_auth_id uuid := gen_random_uuid();
  v_user_id uuid;
  v_email text;
  v_first text;
  v_last text;
  v_role text;
BEGIN
  PERFORM public.require_admin();

  v_first := trim(coalesce(p_first_name, ''));
  v_last := trim(coalesce(p_last_name, ''));
  v_email := lower(trim(coalesce(p_email, '')));
  v_role := lower(trim(coalesce(p_role, 'it')));

  IF v_role NOT IN ('admin', 'hr', 'it') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  IF v_first = '' THEN
    RAISE EXCEPTION 'First name is required';
  END IF;
  IF v_email = '' OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'Email already registered';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'Email already exists';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, is_super_admin, is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_auth_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt('1', gen_salt('bf')),
    now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email'),
      'app_role', v_role
    ),
    jsonb_build_object(
      'sub', v_auth_id::text,
      'email', v_email,
      'first_name', v_first,
      'last_name', v_last,
      'full_name', trim(v_first || ' ' || v_last),
      'must_change_password', true,
      'email_verified', true
    ),
    now(), now(), '', '', '', '', false, false, false
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_auth_id,
    v_auth_id::text,
    jsonb_build_object(
      'sub', v_auth_id::text,
      'email', v_email,
      'email_verified', true,
      'first_name', v_first,
      'last_name', v_last
    ),
    'email',
    now(), now(), now()
  );

  INSERT INTO public.users (
    first_name, last_name, email, phone, job_title, employee_num, location_id, app_role
  ) VALUES (
    v_first,
    NULLIF(v_last, ''),
    v_email,
    NULLIF(trim(coalesce(p_phone, '')), ''),
    NULLIF(trim(coalesce(p_job_title, '')), ''),
    NULLIF(trim(coalesce(p_employee_num, '')), ''),
    p_location_id,
    v_role
  )
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_staff_user(
  p_user_id uuid,
  p_first_name text,
  p_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_job_title text DEFAULT NULL,
  p_employee_num text DEFAULT NULL,
  p_location_id uuid DEFAULT NULL,
  p_role text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
  v_role text;
BEGIN
  PERFORM public.require_admin();

  SELECT lower(email), app_role INTO v_email, v_role FROM public.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_role IS NOT NULL THEN
    v_role := lower(trim(p_role));
    IF v_role NOT IN ('admin', 'hr', 'it') THEN
      RAISE EXCEPTION 'Invalid role';
    END IF;
  END IF;

  UPDATE public.users SET
    first_name = trim(p_first_name),
    last_name = NULLIF(trim(coalesce(p_last_name, '')), ''),
    phone = NULLIF(trim(coalesce(p_phone, '')), ''),
    job_title = NULLIF(trim(coalesce(p_job_title, '')), ''),
    employee_num = NULLIF(trim(coalesce(p_employee_num, '')), ''),
    location_id = p_location_id,
    app_role = coalesce(v_role, app_role)
  WHERE id = p_user_id;

  UPDATE auth.users SET
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('app_role', coalesce(v_role, raw_app_meta_data->>'app_role', 'it')),
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'first_name', trim(p_first_name),
      'last_name', trim(coalesce(p_last_name, '')),
      'full_name', trim(trim(p_first_name) || ' ' || trim(coalesce(p_last_name, '')))
    ) - 'role',
    updated_at = now()
  WHERE lower(email) = v_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_staff_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
BEGIN
  PERFORM public.require_admin();

  SELECT lower(email) INTO v_email FROM public.users WHERE id = p_user_id;
  DELETE FROM public.users WHERE id = p_user_id;

  IF v_email IS NOT NULL AND v_email <> 'admin@stoktakip.com' THEN
    DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = v_email);
    DELETE FROM auth.users WHERE lower(email) = v_email;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_staff_user(text, text, text, text, text, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_staff_user(uuid, text, text, text, text, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_staff_user(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_staff_user(text, text, text, text, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_staff_user(uuid, text, text, text, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_staff_user(uuid) TO authenticated;

-- Ensure existing admin email stays admin in directory when present
UPDATE public.users
SET app_role = 'admin'
WHERE lower(email) = 'admin@stoktakip.com'
  AND (app_role IS DISTINCT FROM 'admin');
