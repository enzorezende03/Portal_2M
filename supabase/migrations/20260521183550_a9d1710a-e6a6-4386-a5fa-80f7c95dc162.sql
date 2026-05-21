-- Documentos: colaborador tem acesso total
CREATE POLICY "documentos_colab_all" ON public.documentos
  FOR ALL
  USING (public.has_role(auth.uid(), 'colaborador'))
  WITH CHECK (public.has_role(auth.uid(), 'colaborador'));

-- Profiles: colaborador pode listar todos os perfis (necessário para a tela)
CREATE POLICY "profiles_colab_select" ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'colaborador'));

-- Clientes: colaborador pode listar todos os clientes
CREATE POLICY "clientes_colab_select" ON public.clientes
  FOR SELECT
  USING (public.has_role(auth.uid(), 'colaborador'));