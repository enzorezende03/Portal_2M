
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE;
ALTER TABLE public.documentos ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.documentos ALTER COLUMN arquivo_url DROP NOT NULL;
CREATE INDEX IF NOT EXISTS documentos_cliente_id_idx ON public.documentos(cliente_id);

ALTER TABLE public.documentos
  DROP CONSTRAINT IF EXISTS documentos_owner_check;
ALTER TABLE public.documentos
  ADD CONSTRAINT documentos_owner_check
  CHECK (user_id IS NOT NULL OR cliente_id IS NOT NULL);

DROP POLICY IF EXISTS documentos_cliente_select ON public.documentos;
CREATE POLICY documentos_cliente_select ON public.documentos
FOR SELECT
USING (
  cliente_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.clientes c
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE c.id = documentos.cliente_id
      AND (
        (c.cnpj IS NOT NULL AND p.cnpj IS NOT NULL AND regexp_replace(c.cnpj,'\D','','g') = regexp_replace(p.cnpj,'\D','','g'))
        OR (c.email IS NOT NULL AND p.email IS NOT NULL AND lower(c.email) = lower(p.email))
      )
  )
);
