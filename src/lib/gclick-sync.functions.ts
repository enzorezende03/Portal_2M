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
        diasAtras: z.number().int().min(1).max(180).default(7),
        offsetDias: z.number().int().min(0).max(180).default(0),
        categoria: CategoriaSchema.optional(),
        logId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return executarSincronizacao({
      diasAtras: data.diasAtras,
      offsetDias: data.offsetDias,
      categoria: data.categoria,
      logId: data.logId,
      disparadoPor: context.userId,
    });
  });

export const listarSyncLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limiteTravado = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    await supabaseAdmin
      .from("gclick_sync_log")
      .update({
        finalizado_em: new Date().toISOString(),
        erros: 1,
        mensagem:
          "FALHA: Sincronização interrompida antes de terminar. Rode novamente com um período menor.",
      })
      .is("finalizado_em", null)
      .lt("iniciado_em", limiteTravado);

    const { data, error } = await supabaseAdmin
      .from("gclick_sync_log")
      .select("*")
      .order("iniciado_em", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });
