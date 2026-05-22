
-- 1) Restrict colaborador access on documentos by empresa via clientes
DROP POLICY IF EXISTS documentos_colab_all ON public.documentos;

CREATE POLICY documentos_colab_select ON public.documentos
FOR SELECT USING (
  has_role(auth.uid(), 'colaborador'::app_role)
  AND cliente_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = documentos.cliente_id
      AND c.empresa_id = current_empresa_id()
  )
);

CREATE POLICY documentos_colab_insert ON public.documentos
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'colaborador'::app_role)
  AND cliente_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = documentos.cliente_id
      AND c.empresa_id = current_empresa_id()
  )
);

CREATE POLICY documentos_colab_update ON public.documentos
FOR UPDATE USING (
  has_role(auth.uid(), 'colaborador'::app_role)
  AND cliente_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = documentos.cliente_id
      AND c.empresa_id = current_empresa_id()
  )
) WITH CHECK (
  has_role(auth.uid(), 'colaborador'::app_role)
  AND cliente_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = documentos.cliente_id
      AND c.empresa_id = current_empresa_id()
  )
);

CREATE POLICY documentos_colab_delete ON public.documentos
FOR DELETE USING (
  has_role(auth.uid(), 'colaborador'::app_role)
  AND cliente_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = documentos.cliente_id
      AND c.empresa_id = current_empresa_id()
  )
);

-- 2) Restrict empresas SELECT to own empresa only (admins keep full access via empresas_admin_all)
DROP POLICY IF EXISTS empresas_select_authenticated ON public.empresas;

CREATE POLICY empresas_select_own ON public.empresas
FOR SELECT USING (
  auth.uid() IS NOT NULL AND id = current_empresa_id()
);
