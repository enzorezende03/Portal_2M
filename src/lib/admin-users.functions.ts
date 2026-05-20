import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const DEFAULT_CLIENTE_PASSWORD = "2m_Brand";

const schema = z.object({
  email: z.string().email().max(255),
  nome: z.string().min(1).max(255),
  empresa_id: z.string().uuid().nullable().optional(),
});

export const createClienteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data, context }) => {
    // Verifica se quem chama é admin
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (!roles?.some((r) => r.role === "admin")) {
      throw new Error("Apenas administradores podem criar usuários");
    }

    // Cria o usuário no Auth com senha padrão e email já confirmado
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: DEFAULT_CLIENTE_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });

    if (error || !created.user) {
      throw new Error(error?.message ?? "Falha ao criar usuário");
    }

    // Marca para troca obrigatória de senha + vincula empresa
    await supabaseAdmin
      .from("profiles")
      .update({
        must_reset_password: true,
        ...(data.empresa_id ? { empresa_id: data.empresa_id } : {}),
      })
      .eq("id", created.user.id);

    return { id: created.user.id, email: created.user.email };
  });
