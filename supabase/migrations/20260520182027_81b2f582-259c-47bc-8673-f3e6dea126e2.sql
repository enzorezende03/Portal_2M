CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cnpj text,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  origem text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clientes_empresa_id_idx ON public.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS clientes_cnpj_idx ON public.clientes(cnpj);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY clientes_admin_all ON public.clientes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));