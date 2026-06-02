DO $$
DECLARE
  v_total int;
BEGIN
  CREATE TEMP TABLE _profile_sigs ON COMMIT DROP AS
  WITH groups AS (
    SELECT id, created_at, lower(trim(nome)) AS k FROM public.profiles WHERE nome IS NOT NULL
  ),
  dup AS (SELECT k FROM groups GROUP BY k HAVING count(*) > 1),
  sigs AS (
    SELECT g.id AS profile_id, g.k, g.created_at,
      CASE WHEN d.id IS NULL THEN NULL
        ELSE lower(trim(coalesce(d.nome,''))) || '|' || coalesce(d.competencia,'') || '|' || coalesce(d.vencimento::text,'')
      END AS sig
    FROM groups g
    JOIN dup USING(k)
    LEFT JOIN public.documentos d ON d.user_id = g.id
  )
  SELECT profile_id, k, created_at,
    count(sig) AS doc_count,
    coalesce(array_agg(DISTINCT sig) FILTER (WHERE sig IS NOT NULL), '{}'::text[]) AS sig_set
  FROM sigs GROUP BY profile_id, k, created_at;

  CREATE TEMP TABLE _ranked ON COMMIT DROP AS
  SELECT ps.*,
    row_number() OVER (PARTITION BY k, sig_set ORDER BY doc_count DESC, created_at ASC, profile_id) AS rn_bucket,
    EXISTS (SELECT 1 FROM _profile_sigs ps2 WHERE ps2.k = ps.k AND ps2.doc_count > 0) AS group_has_docs
  FROM _profile_sigs ps;

  CREATE TEMP TABLE _to_delete ON COMMIT DROP AS
  SELECT profile_id FROM _ranked
  WHERE (doc_count > 0 AND rn_bucket > 1)
     OR (doc_count = 0 AND group_has_docs)
     OR (doc_count = 0 AND NOT group_has_docs AND rn_bucket > 1);

  SELECT count(*) INTO v_total FROM _to_delete;
  RAISE NOTICE 'Perfis a excluir: %', v_total;

  -- Remove documentos vinculados aos perfis duplicados (já existem no perfil mantido)
  DELETE FROM public.documentos WHERE user_id IN (SELECT profile_id FROM _to_delete);

  -- Remove dos usuários auth (cascateia para profiles, user_roles, etc.)
  DELETE FROM auth.users WHERE id IN (SELECT profile_id FROM _to_delete);
END $$;