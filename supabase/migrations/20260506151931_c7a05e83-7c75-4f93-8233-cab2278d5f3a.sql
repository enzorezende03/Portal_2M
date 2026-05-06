
-- Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'cliente');

-- EMPRESAS
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  logo_url TEXT,
  cor_primary TEXT NOT NULL DEFAULT '#229B8D',
  cor_navy TEXT NOT NULL DEFAULT '#23425A',
  cor_soft TEXT NOT NULL DEFAULT '#9FB5B7',
  cor_bg TEXT NOT NULL DEFAULT '#F5F7F7',
  cor_text TEXT NOT NULL DEFAULT '#1A2E3F',
  fonte_titulo TEXT NOT NULL DEFAULT 'Bellezza',
  fonte_corpo TEXT NOT NULL DEFAULT 'Inter',
  fonte_decorativa TEXT NOT NULL DEFAULT 'Pinyon Script',
  whatsapp TEXT,
  email_suporte TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  nome TEXT,
  email TEXT,
  telefone TEXT,
  cargo TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER ROLES (separado por segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Função has_role (security definer p/ evitar recursão em RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para pegar empresa do usuário corrente
CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
$$;

-- FERRAMENTAS
CREATE TABLE public.ferramentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT,
  url_acesso TEXT NOT NULL,
  abre_em_nova_aba BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ferramentas_empresas (
  ferramenta_id UUID REFERENCES public.ferramentas(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  PRIMARY KEY (ferramenta_id, empresa_id)
);

-- TREINAMENTOS
CREATE TABLE public.categorias_treinamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0
);

CREATE TABLE public.treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria_id UUID REFERENCES public.categorias_treinamento(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  duracao_segundos INT,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.treinamentos_empresas (
  treinamento_id UUID REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  PRIMARY KEY (treinamento_id, empresa_id)
);

CREATE TABLE public.treinamento_progresso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  treinamento_id UUID NOT NULL REFERENCES public.treinamentos(id) ON DELETE CASCADE,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_em TIMESTAMPTZ,
  UNIQUE (user_id, treinamento_id)
);

-- ONBOARDING
CREATE TABLE public.onboarding_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'video', -- video|checklist|formulario|link|documento
  conteudo JSONB NOT NULL DEFAULT '{}'::jsonb,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.onboarding_etapas_empresas (
  etapa_id UUID REFERENCES public.onboarding_etapas(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  PRIMARY KEY (etapa_id, empresa_id)
);

CREATE TABLE public.onboarding_progresso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  etapa_id UUID NOT NULL REFERENCES public.onboarding_etapas(id) ON DELETE CASCADE,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_em TIMESTAMPTZ,
  UNIQUE (user_id, etapa_id)
);

-- AVISOS
CREATE TABLE public.avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info', -- info|warning|success
  ativo BOOLEAN NOT NULL DEFAULT true,
  inicio_em TIMESTAMPTZ DEFAULT now(),
  fim_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.avisos_empresas (
  aviso_id UUID REFERENCES public.avisos(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  PRIMARY KEY (aviso_id, empresa_id)
);

-- Trigger criar profile no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Habilitar RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferramentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferramentas_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_treinamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinamentos_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinamento_progresso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_etapas_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progresso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_empresas ENABLE ROW LEVEL SECURITY;

-- POLICIES: empresas (público p/ leitura, admin p/ escrita)
CREATE POLICY "empresas_select_all" ON public.empresas FOR SELECT USING (true);
CREATE POLICY "empresas_admin_all" ON public.empresas FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- profiles: dono + admin
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_admin_delete" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: usuário lê o próprio; admin gerencia
CREATE POLICY "roles_self_select" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ferramentas: usuário vê se a ferramenta está vinculada à sua empresa; admin tudo
CREATE POLICY "ferramentas_select_by_empresa" ON public.ferramentas FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.ferramentas_empresas fe
    WHERE fe.ferramenta_id = ferramentas.id AND fe.empresa_id = public.current_empresa_id()
  )
);
CREATE POLICY "ferramentas_admin_all" ON public.ferramentas FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "fe_select" ON public.ferramentas_empresas FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR empresa_id = public.current_empresa_id()
);
CREATE POLICY "fe_admin_all" ON public.ferramentas_empresas FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- categorias: todos autenticados leem; admin escreve
CREATE POLICY "categorias_select" ON public.categorias_treinamento FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "categorias_admin_all" ON public.categorias_treinamento FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- treinamentos: vinculado à empresa
CREATE POLICY "treinamentos_select_by_empresa" ON public.treinamentos FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.treinamentos_empresas te
    WHERE te.treinamento_id = treinamentos.id AND te.empresa_id = public.current_empresa_id()
  )
);
CREATE POLICY "treinamentos_admin_all" ON public.treinamentos FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "te_select" ON public.treinamentos_empresas FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR empresa_id = public.current_empresa_id()
);
CREATE POLICY "te_admin_all" ON public.treinamentos_empresas FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- treinamento_progresso: dono
CREATE POLICY "tp_self_all" ON public.treinamento_progresso FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tp_admin_select" ON public.treinamento_progresso FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- onboarding_etapas
CREATE POLICY "onb_select_by_empresa" ON public.onboarding_etapas FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.onboarding_etapas_empresas oe
    WHERE oe.etapa_id = onboarding_etapas.id AND oe.empresa_id = public.current_empresa_id()
  )
);
CREATE POLICY "onb_admin_all" ON public.onboarding_etapas FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "oe_select" ON public.onboarding_etapas_empresas FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR empresa_id = public.current_empresa_id()
);
CREATE POLICY "oe_admin_all" ON public.onboarding_etapas_empresas FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "op_self_all" ON public.onboarding_progresso FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "op_admin_select" ON public.onboarding_progresso FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- avisos
CREATE POLICY "avisos_select_by_empresa" ON public.avisos FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.avisos_empresas ae
    WHERE ae.aviso_id = avisos.id AND ae.empresa_id = public.current_empresa_id()
  )
);
CREATE POLICY "avisos_admin_all" ON public.avisos FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ae_select" ON public.avisos_empresas FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR empresa_id = public.current_empresa_id()
);
CREATE POLICY "ae_admin_all" ON public.avisos_empresas FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_user_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "avatars_user_update" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "avatars_user_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Seed das duas empresas
INSERT INTO public.empresas (slug, nome, cor_primary, cor_navy, cor_soft, cor_bg, cor_text, fonte_titulo, fonte_corpo, fonte_decorativa)
VALUES
  ('saude', '2M Saúde', '#229B8D', '#23425A', '#9FB5B7', '#F5F7F7', '#1A2E3F', 'Bellezza', 'Inter', 'Pinyon Script'),
  ('contabilidade', '2M Contabilidade', '#37608B', '#3A5278', '#D1D1D1', '#FFFFFF', '#1F2A3D', 'Cinzel', 'Inter', 'Pinyon Script');
