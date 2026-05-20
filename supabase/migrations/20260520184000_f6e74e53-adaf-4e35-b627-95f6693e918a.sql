DO $$
DECLARE
  r RECORD;
  new_user_id uuid;
  digits text;
  placeholder_email text;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (regexp_replace(cnpj,'\D','','g'))
      regexp_replace(cnpj,'\D','','g') AS cnpj_digits,
      nome,
      empresa_id
    FROM public.clientes
    WHERE origem = 'distribuilucros_import'
      AND cnpj IS NOT NULL
      AND length(regexp_replace(cnpj,'\D','','g')) = 14
    ORDER BY regexp_replace(cnpj,'\D','','g'), nome
  LOOP
    digits := r.cnpj_digits;
    placeholder_email := digits || '@distribuilucros.local';

    IF EXISTS (SELECT 1 FROM public.profiles WHERE regexp_replace(coalesce(cnpj,''),'\D','','g') = digits) THEN
      CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = placeholder_email) THEN
      CONTINUE;
    END IF;

    new_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id, 'authenticated', 'authenticated',
      placeholder_email,
      crypt(digits, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome', r.nome, 'cnpj', digits, 'origem','distribuilucros_import'),
      '', '', '', ''
    );

    INSERT INTO public.profiles (id, nome, email, cnpj, empresa_id, must_reset_password)
    VALUES (new_user_id, r.nome, placeholder_email, digits, r.empresa_id, true)
    ON CONFLICT (id) DO UPDATE
      SET nome = EXCLUDED.nome,
          cnpj = EXCLUDED.cnpj,
          empresa_id = EXCLUDED.empresa_id,
          must_reset_password = true;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'cliente')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;