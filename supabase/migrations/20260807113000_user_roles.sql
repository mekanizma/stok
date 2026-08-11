/*
# Role-based access: hr | it (admin is auth metadata only)
*/

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS app_role text;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_app_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_app_role_check
  CHECK (app_role IS NULL OR app_role IN ('hr', 'it'));

DROP FUNCTION IF EXISTS public.create_staff_user(text, text, text, text, text, text, uuid);

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_first := trim(coalesce(p_first_name, ''));
  v_last := trim(coalesce(p_last_name, ''));
  v_email := lower(trim(coalesce(p_email, '')));
  v_role := lower(trim(coalesce(p_role, 'it')));

  IF v_role NOT IN ('hr', 'it') THEN
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
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'sub', v_auth_id::text,
      'email', v_email,
      'first_name', v_first,
      'last_name', v_last,
      'full_name', trim(v_first || ' ' || v_last),
      'must_change_password', true,
      'role', v_role,
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(email), app_role INTO v_email, v_role FROM public.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_role IS NOT NULL THEN
    v_role := lower(trim(p_role));
    IF v_role NOT IN ('hr', 'it') THEN
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
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'first_name', trim(p_first_name),
      'last_name', trim(coalesce(p_last_name, '')),
      'full_name', trim(trim(p_first_name) || ' ' || trim(coalesce(p_last_name, ''))),
      'role', coalesce(v_role, raw_user_meta_data->>'role', 'it')
    ),
    updated_at = now()
  WHERE lower(email) = v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_staff_user(text, text, text, text, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_staff_user(uuid, text, text, text, text, text, uuid, text) TO authenticated;
