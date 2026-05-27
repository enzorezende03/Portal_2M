
-- 1) Prevent privilege escalation via empresa_id self-update
CREATE OR REPLACE FUNCTION public.prevent_profile_empresa_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can change empresa_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_empresa_change ON public.profiles;
CREATE TRIGGER profiles_prevent_empresa_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_empresa_change();

-- 2) Storage policies for colaboradores on documentos-clientes bucket
-- Allow colaboradores SELECT/INSERT/UPDATE/DELETE on files belonging to clientes of their empresa
CREATE POLICY "documentos_storage_colab_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos-clientes'
  AND public.has_role(auth.uid(), 'colaborador')
  AND EXISTS (
    SELECT 1 FROM public.documentos d
    JOIN public.clientes c ON c.id = d.cliente_id
    WHERE d.arquivo_path = storage.objects.name
      AND c.empresa_id = public.current_empresa_id()
  )
);

CREATE POLICY "documentos_storage_colab_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos-clientes'
  AND public.has_role(auth.uid(), 'colaborador')
  AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.empresa_id = public.current_empresa_id()
      AND storage.objects.name LIKE c.id::text || '/%'
  )
);

CREATE POLICY "documentos_storage_colab_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documentos-clientes'
  AND public.has_role(auth.uid(), 'colaborador')
  AND EXISTS (
    SELECT 1 FROM public.documentos d
    JOIN public.clientes c ON c.id = d.cliente_id
    WHERE d.arquivo_path = storage.objects.name
      AND c.empresa_id = public.current_empresa_id()
  )
);

CREATE POLICY "documentos_storage_colab_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documentos-clientes'
  AND public.has_role(auth.uid(), 'colaborador')
  AND EXISTS (
    SELECT 1 FROM public.documentos d
    JOIN public.clientes c ON c.id = d.cliente_id
    WHERE d.arquivo_path = storage.objects.name
      AND c.empresa_id = public.current_empresa_id()
  )
);
