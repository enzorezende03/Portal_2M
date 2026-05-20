import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
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

    // Cria o usuário no Auth com email já confirmado
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });

    if (error || !created.user) {
      throw new Error(error?.message ?? "Falha ao criar usuário");
    }

    // Vincula empresa se informada (o trigger handle_new_user já criou o profile)
    if (data.empresa_id) {
      await supabaseAdmin
        .from("profiles")
        .update({ empresa_id: data.empresa_id })
        .eq("id", created.user.id);
    }

    return { id: created.user.id, email: created.user.email };
  });
