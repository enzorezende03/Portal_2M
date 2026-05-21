import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { executarSincronizacao } from "./gclick-sync.server";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: roles } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  if (!roles?.some((r: any) => r.role === "admin")) {
    throw new Error("Apenas administradores podem executar esta ação");
  }
}

const CategoriaSchema = z.enum([
  "Obrigacao",
  "Solicitacao",
  "Cobranca",
  "CertificadoDigital",
]);

export const sincronizarGclick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        diasAtras: z.number().int().min(1).max(180).default(30),
        categoria: CategoriaSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return executarSincronizacao({
      diasAtras: data.diasAtras,
      categoria: data.categoria,
      disparadoPor: context.userId,
    });
  });

export const listarSyncLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("gclick_sync_log")
      .select("*")
      .order("iniciado_em", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });
