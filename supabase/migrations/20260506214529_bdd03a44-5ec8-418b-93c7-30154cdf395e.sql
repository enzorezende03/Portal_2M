ALTER TABLE public.ferramentas
ADD COLUMN IF NOT EXISTS requer_sso boolean NOT NULL DEFAULT false;