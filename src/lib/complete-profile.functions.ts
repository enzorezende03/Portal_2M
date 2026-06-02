import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email().max(255).optional(),
  cnpj: z.string().trim().max(32).optional(),
});

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

export function isGenericEmail(email: string | null | undefined) {
  if (!email) return true;
  const e = email.toLowerCase();
  return e.endsWith("@distribuilucros.local") || e.endsWith(".local");
}

export function isMissingCnpj(cnpj: string | null | undefined) {
  if (!cnpj) return true;
  return onlyDigits(cnpj).length !== 14;
}

export const completeFirstLoginProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, cnpj")
      .eq("id", userId)
      .maybeSingle();
    if (pErr || !profile) throw new Error(pErr?.message ?? "Perfil não encontrado");

    const needsEmail = isGenericEmail(profile.email);
    const needsCnpj = isMissingCnpj(profile.cnpj);

    const newEmail = data.email?.toLowerCase();
    const newCnpjDigits = data.cnpj ? onlyDigits(data.cnpj) : undefined;

    if (needsEmail && !newEmail) throw new Error("Informe seu email");
    if (needsCnpj) {
      if (!newCnpjDigits) throw new Error("Informe seu CNPJ");
      if (newCnpjDigits.length !== 14) throw new Error("CNPJ inválido");
    }

    // Uniqueness checks
    if (needsEmail && newEmail) {
      const { data: dup } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", newEmail)
        .neq("id", userId)
        .limit(1);
      if (dup && dup.length > 0) throw new Error("Este email já está em uso");
    }
    if (needsCnpj && newCnpjDigits) {
      const { data: allCnpj } = await supabaseAdmin
        .from("profiles")
        .select("id, cnpj")
        .not("cnpj", "is", null)
        .neq("id", userId);
      const conflict = (allCnpj ?? []).some(
        (p) => p.cnpj && onlyDigits(p.cnpj) === newCnpjDigits,
      );
      if (conflict) throw new Error("Este CNPJ já está em uso");
    }

    const updates: { email?: string; cnpj?: string } = {};
    if (needsEmail && newEmail) updates.email = newEmail;
    if (needsCnpj && newCnpjDigits) updates.cnpj = newCnpjDigits;

    if (Object.keys(updates).length > 0) {
      const { error: upErr } = await supabaseAdmin
        .from("profiles")
        .update(updates)
        .eq("id", userId);
      if (upErr) throw new Error(upErr.message);
    }

    // Update auth.users email so user can sign in with it
    if (needsEmail && newEmail) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email: newEmail, email_confirm: true },
      );
      if (authErr) throw new Error(authErr.message);
    }

    return { ok: true };
  });
