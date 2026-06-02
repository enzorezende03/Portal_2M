import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const schema = z.object({
  targetUserId: z.string().uuid(),
});

export const impersonateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data, context }) => {
    // Verificar se o caller é admin
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r: any) => r.role === "admin")) {
      throw new Error("Apenas administradores podem usar 'Ver como'.");
    }

    if (data.targetUserId === context.userId) {
      throw new Error("Você já está logado como esse usuário.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: getErr } =
      await supabaseAdmin.auth.admin.getUserById(data.targetUserId);
    if (getErr || !target?.user?.email) {
      throw new Error("Usuário alvo não possui email cadastrado e não pode ser acessado.");
    }

    // Não permitir impersonar outro admin
    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.targetUserId);
    if (targetRoles?.some((r: any) => r.role === "admin")) {
      throw new Error("Não é permitido entrar como outro administrador.");
    }

    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: target.user.email,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      throw new Error(linkErr?.message ?? "Falha ao gerar acesso de impersonação.");
    }

    console.log(
      `[impersonation] admin=${context.userId} -> target=${data.targetUserId} (${target.user.email})`,
    );

    return {
      tokenHash: link.properties.hashed_token,
      email: target.user.email,
      targetUserId: data.targetUserId,
    };
  });
