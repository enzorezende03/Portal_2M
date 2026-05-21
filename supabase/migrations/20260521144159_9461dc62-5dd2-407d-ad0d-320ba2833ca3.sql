
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS gclick_atividade_id text,
  ADD COLUMN IF NOT EXISTS competencia text,
  ADD COLUMN IF NOT EXISTS vencimento date;

CREATE UNIQUE INDEX IF NOT EXISTS documentos_gclick_atividade_id_key
  ON public.documentos (gclick_atividade_id)
  WHERE gclick_atividade_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.gclick_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  importados integer NOT NULL DEFAULT 0,
  ignorados integer NOT NULL DEFAULT 0,
  erros integer NOT NULL DEFAULT 0,
  pendencias jsonb NOT NULL DEFAULT '[]'::jsonb,
  mensagem text,
  disparado_por uuid
);

ALTER TABLE public.gclick_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY gclick_sync_log_admin_all
  ON public.gclick_sync_log
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
