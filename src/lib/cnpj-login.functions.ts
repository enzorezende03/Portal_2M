import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const schema = z.object({
  cnpj: z.string().min(11).max(20),
});

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

/**
 * Resolve um email de login a partir do CNPJ.
 * - Procura a empresa pelo CNPJ (comparando apenas dígitos).
 * - Acha o profile vinculado àquela empresa.
 * - Se houver mais de um profile, retorna erro pedindo email.
 *
 * Sem auth: é o passo anterior ao signIn.
 */
export const resolveEmailByCnpj = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const digits = onlyDigits(data.cnpj);
    if (digits.length !== 14) {
      throw new Error("CNPJ inválido");
    }

    // Busca todas empresas e compara por dígitos (formatação pode variar no banco)
    const { data: empresas, error: empErr } = await supabaseAdmin
      .from("empresas")
      .select("id, cnpj");
    if (empErr) throw new Error(empErr.message);

    const empresa = (empresas ?? []).find(
      (e) => e.cnpj && onlyDigits(e.cnpj) === digits,
    );
    if (!empresa) {
      throw new Error("CNPJ não encontrado");
    }

    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("empresa_id", empresa.id)
      .not("email", "is", null);
    if (profErr) throw new Error(profErr.message);

    const valid = (profiles ?? []).filter((p) => !!p.email);
    if (valid.length === 0) {
      throw new Error("Nenhum usuário vinculado a este CNPJ");
    }
    if (valid.length > 1) {
      throw new Error(
        "Mais de um usuário vinculado a este CNPJ. Entre com seu email.",
      );
    }

    return { email: valid[0].email as string };
  });
