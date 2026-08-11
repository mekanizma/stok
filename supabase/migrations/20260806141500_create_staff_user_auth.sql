/*
# Staff user auth provisioning

Creates login accounts when admin adds users.
Default password is "1"; user must change it on first login (must_change_password metadata).
*/

CREATE OR REPLACE FUNCTION public.create_staff_user(
  p_first_name text,
  p_last_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_job_title text DEFAULT NULL,
  p_employee_num text DEFAULT NULL,
  p_location_id uuid DEFAULT NULL
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_first := trim(coalesce(p_first_name, ''));
  v_last := trim(coalesce(p_last_name, ''));
  v_email := lower(trim(coalesce(p_email, '')));

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
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    is_super_admin,
    is_sso_user,
    is_anonymous
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
      'role', 'user',
      'email_verified', true
    ),
    now(),
    now(),
    '',
    '',
    '',
    '',
    false,
    false,
    false
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
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
    now(),
    now(),
    now()
  );

  INSERT INTO public.users (
    first_name,
    last_name,
    email,
    phone,
    job_title,
    employee_num,
    location_id
  ) VALUES (
    v_first,
    NULLIF(v_last, ''),
    v_email,
    NULLIF(trim(coalesce(p_phone, '')), ''),
    NULLIF(trim(coalesce(p_job_title, '')), ''),
    NULLIF(trim(coalesce(p_employee_num, '')), ''),
    p_location_id
  )
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(email) INTO v_email FROM public.users WHERE id = p_user_id;
  DELETE FROM public.users WHERE id = p_user_id;

  IF v_email IS NOT NULL AND v_email <> 'admin@stoktakip.com' THEN
    DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = v_email);
    DELETE FROM auth.users WHERE lower(email) = v_email;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_staff_user(text, text, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_staff_user(uuid) TO authenticated;
