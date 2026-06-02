
DO $$
DECLARE
  r RECORD;
  keeper_id uuid;
  loser_id uuid;
  loser_email text;
BEGIN
  FOR r IN
    WITH norm AS (
      SELECT id, lower(trim(nome)) AS k, email, cnpj,
        (email IS NOT NULL AND lower(email) NOT LIKE '%@distribuilucros.local' AND lower(email) NOT LIKE '%.local') AS has_real_email,
        (cnpj IS NOT NULL AND length(regexp_replace(cnpj,'\D','','g'))=14) AS has_cnpj
      FROM public.profiles
      WHERE nome IS NOT NULL AND trim(nome) <> ''
    )
    SELECT k FROM norm
    GROUP BY k
    HAVING count(*) > 1
      AND sum(CASE WHEN has_real_email AND NOT has_cnpj THEN 1 ELSE 0 END) > 0
      AND sum(CASE WHEN has_cnpj AND NOT has_real_email THEN 1 ELSE 0 END) > 0
  LOOP
    SELECT id INTO keeper_id
    FROM public.profiles
    WHERE lower(trim(nome)) = r.k
      AND cnpj IS NOT NULL
      AND length(regexp_replace(cnpj,'\D','','g'))=14
    ORDER BY created_at ASC
    LIMIT 1;

    SELECT id, email INTO loser_id, loser_email
    FROM public.profiles
    WHERE lower(trim(nome)) = r.k
      AND id <> keeper_id
      AND email IS NOT NULL
      AND lower(email) NOT LIKE '%@distribuilucros.local'
      AND lower(email) NOT LIKE '%.local'
    ORDER BY created_at ASC
    LIMIT 1;

    IF keeper_id IS NULL OR loser_id IS NULL THEN CONTINUE; END IF;

    -- Dedupe loser docs that already exist on keeper
    DELETE FROM public.documentos d
    WHERE d.user_id = loser_id
      AND EXISTS (
        SELECT 1 FROM public.documentos k
        WHERE k.user_id = keeper_id
          AND lower(trim(k.nome)) = lower(trim(d.nome))
          AND coalesce(k.competencia,'') = coalesce(d.competencia,'')
          AND coalesce(k.vencimento::text,'') = coalesce(d.vencimento::text,'')
      );

    -- Reassign remaining loser docs to keeper
    UPDATE public.documentos SET user_id = keeper_id WHERE user_id = loser_id;

    -- Delete loser FIRST (frees the email)
    DELETE FROM public.profiles WHERE id = loser_id;
    DELETE FROM auth.users WHERE id = loser_id;

    -- Now safely move email to keeper
    UPDATE public.profiles SET email = loser_email WHERE id = keeper_id;
    UPDATE auth.users
      SET email = loser_email,
          email_confirmed_at = coalesce(email_confirmed_at, now())
      WHERE id = keeper_id;

    RAISE NOTICE 'Merged % -> %', loser_id, keeper_id;
  END LOOP;
END $$;
