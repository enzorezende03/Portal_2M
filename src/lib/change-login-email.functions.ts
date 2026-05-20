import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const changeLoginEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ newEmail: z.string().email().max(255) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const newEmail = data.newEmail.trim().toLowerCase();

    // Verifica se já existe outro usuário com esse email
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", newEmail)
      .neq("id", userId)
      .maybeSingle();
    if (existing) {
      throw new Error("Este email já está em uso por outra conta.");
    }

    // Atualiza auth.users (email de login) sem exigir confirmação
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: newEmail, email_confirm: true },
    );
    if (authErr) throw new Error(authErr.message);

    // Sincroniza profiles
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({ email: newEmail })
      .eq("id", userId);
    if (profErr) throw new Error(profErr.message);

    // Sincroniza tabela clientes pelo CNPJ do perfil
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("cnpj")
      .eq("id", userId)
      .maybeSingle();
    if (prof?.cnpj) {
      await supabaseAdmin
        .from("clientes")
        .update({ email: newEmail })
        .eq("cnpj", prof.cnpj);
    }

    return { ok: true, email: newEmail };
  });
