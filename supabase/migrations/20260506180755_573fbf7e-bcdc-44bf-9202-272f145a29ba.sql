ALTER TABLE public.treinamento_progresso
ADD COLUMN IF NOT EXISTS segundos_assistidos integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS treinamento_progresso_user_treino_unique
ON public.treinamento_progresso (user_id, treinamento_id);