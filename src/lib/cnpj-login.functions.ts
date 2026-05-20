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
 * 1) Procura um profile cujo CNPJ casa (clientes importados do DistribuiLucros).
 * 2) Senão, casa pelo CNPJ da empresa (2M Saúde / 2M Contabilidade).
 */
export const resolveEmailByCnpj = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const digits = onlyDigits(data.cnpj);
    if (digits.length !== 14) throw new Error("CNPJ inválido");

    // 1) Match direto pelo CNPJ do profile (clientes importados)
    const { data: profilesByCnpj, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, cnpj")
      .not("email", "is", null)
      .not("cnpj", "is", null);
    if (pErr) throw new Error(pErr.message);

    const direct = (profilesByCnpj ?? []).filter(
      (p) => p.cnpj && onlyDigits(p.cnpj) === digits && p.email,
    );
    if (direct.length === 1) return { email: direct[0].email as string };
    if (direct.length > 1) {
      throw new Error("Mais de um usuário com este CNPJ. Entre com seu email.");
    }

    // 2) Fallback: CNPJ da empresa
    const { data: empresas, error: empErr } = await supabaseAdmin
      .from("empresas")
      .select("id, cnpj");
    if (empErr) throw new Error(empErr.message);

    const empresa = (empresas ?? []).find(
      (e) => e.cnpj && onlyDigits(e.cnpj) === digits,
    );
    if (!empresa) throw new Error("CNPJ não encontrado");

    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("empresa_id", empresa.id)
      .not("email", "is", null);
    if (profErr) throw new Error(profErr.message);

    const valid = (profiles ?? []).filter((p) => !!p.email);
    if (valid.length === 0) throw new Error("Nenhum usuário vinculado a este CNPJ");
    if (valid.length > 1) {
      throw new Error("Mais de um usuário vinculado a este CNPJ. Entre com seu email.");
    }
    return { email: valid[0].email as string };
  });
