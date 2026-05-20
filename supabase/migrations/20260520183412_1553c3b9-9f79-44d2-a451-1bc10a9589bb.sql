CREATE POLICY clientes_self_update ON public.clientes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        (clientes.email IS NOT NULL AND clientes.email = p.email)
        OR (clientes.cnpj IS NOT NULL AND clientes.cnpj = p.cnpj)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        (clientes.email IS NOT NULL AND clientes.email = p.email)
        OR (clientes.cnpj IS NOT NULL AND clientes.cnpj = p.cnpj)
      )
  )
);