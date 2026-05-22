
-- 1) clientes: colaborador só vê da própria empresa
DROP POLICY IF EXISTS clientes_colab_select ON public.clientes;
CREATE POLICY clientes_colab_select ON public.clientes
  FOR SELECT
  USING (has_role(auth.uid(), 'colaborador'::app_role) AND empresa_id = current_empresa_id());

-- 2) profiles: colaborador só vê da própria empresa
DROP POLICY IF EXISTS profiles_colab_select ON public.profiles;
CREATE POLICY profiles_colab_select ON public.profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'colaborador'::app_role) AND empresa_id = current_empresa_id());

-- 3) empresas: restringe leitura ampla a autenticados; cria view pública só com branding
DROP POLICY IF EXISTS empresas_select_all ON public.empresas;
CREATE POLICY empresas_select_authenticated ON public.empresas
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE VIEW public.empresas_public
WITH (security_invoker = on) AS
SELECT id, nome, slug, logo_url,
       cor_primary, cor_navy, cor_soft, cor_bg, cor_text,
       fonte_titulo, fonte_corpo, fonte_decorativa
FROM public.empresas;

GRANT SELECT ON public.empresas_public TO anon, authenticated;

-- 4) Storage: documentos-clientes — permitir leitura quando há vínculo via tabela documentos
DROP POLICY IF EXISTS "documentos_storage_self_read" ON storage.objects;
CREATE POLICY "documentos_storage_self_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos-clientes'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.documentos d
        WHERE d.arquivo_path = storage.objects.name
          AND (
            d.user_id = auth.uid()
            OR (
              d.cliente_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.clientes c
                JOIN public.profiles p ON p.id = auth.uid()
                WHERE c.id = d.cliente_id
                  AND (
                    (c.email IS NOT NULL AND p.email IS NOT NULL
                       AND lower(c.email) = lower(p.email))
                    OR (c.cnpj IS NOT NULL AND p.cnpj IS NOT NULL
                       AND regexp_replace(c.cnpj,'\D','','g') = regexp_replace(p.cnpj,'\D','','g'))
                  )
              )
            )
          )
      )
    )
  );

-- 5) Storage: treinamentos — exigir autenticação
DROP POLICY IF EXISTS "treinamentos_videos_read" ON storage.objects;
CREATE POLICY "treinamentos_videos_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'treinamentos-videos');

DROP POLICY IF EXISTS "treinamentos_pdfs_read" ON storage.objects;
CREATE POLICY "treinamentos_pdfs_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'treinamentos-pdfs');

-- 6) Revogar EXECUTE de handle_new_user (só usado por trigger)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
