
-- Tabela de documentos por cliente
CREATE TABLE public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  arquivo_url text NOT NULL,
  arquivo_path text NOT NULL,
  tamanho_bytes bigint,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_documentos_user_id ON public.documentos(user_id);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Admin pode tudo
CREATE POLICY documentos_admin_all ON public.documentos
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Cliente pode apenas ver os próprios
CREATE POLICY documentos_self_select ON public.documentos
  FOR SELECT USING (auth.uid() = user_id);

-- Bucket privado para arquivos
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-clientes', 'documentos-clientes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "documentos_storage_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'documentos-clientes' AND has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'documentos-clientes' AND has_role(auth.uid(), 'admin'));

-- Cliente pode ler somente os arquivos dentro da pasta do seu user_id
CREATE POLICY "documentos_storage_self_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos-clientes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
