import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import {
  listarTarefasGclick,
  listarAtividadesPorTarefa,
  extrairAnexoUrl,
  baixarAnexo,
  onlyDigits,
  type GclickTarefa,
  type GclickAtividade,
} from "./gclick.server";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: roles } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  if (!roles?.some((r: any) => r.role === "admin")) {
    throw new Error("Apenas administradores podem executar esta ação");
  }
}

type Pendencia = {
  tarefa_id: string;
  atividade_id: string;
  cliente_nome?: string;
  cnpj?: string;
  motivo: string;
};

export async function executarSincronizacao(opts: {
  diasAtras: number;
  disparadoPor?: string | null;
}) {
  const ate = new Date();
  const de = new Date();
  de.setDate(de.getDate() - opts.diasAtras);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const { data: logRow, error: logErr } = await supabaseAdmin
    .from("gclick_sync_log")
    .insert({ disparado_por: opts.disparadoPor ?? null })
    .select()
    .single();
  if (logErr) throw new Error(logErr.message);
  const logId = (logRow as any).id as string;

  let importados = 0;
  let ignorados = 0;
  let erros = 0;
  const pendencias: Pendencia[] = [];

  try {
    // Carrega map de CNPJ -> user_id uma única vez
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, cnpj, email, nome");
    const byCnpj = new Map<string, { id: string; nome: string | null }>();
    for (const p of profiles ?? []) {
      const k = onlyDigits((p as any).cnpj);
      if (k) byCnpj.set(k, { id: (p as any).id, nome: (p as any).nome });
    }

    // Pagina as tarefas
    let page = 0;
    const size = 100;
    while (true) {
      const tarefas = await listarTarefasGclick({
        dataInicio: fmt(de),
        dataFim: fmt(ate),
        page,
        size,
      });
      if (tarefas.length === 0) break;

      for (const t of tarefas) {
        const cnpjT = onlyDigits(t.cliente?.cnpj ?? t.cliente?.inscricao);
        const atividades = await listarAtividadesPorTarefa(t.id).catch(
          () => [] as GclickAtividade[],
        );

        for (const a of atividades) {
          const url = extrairAnexoUrl(a);
          const concluida = a.concluido === true || /conclu/i.test(a.status ?? "");
          if (!url || !concluida) continue;

          const atividadeKey = `${t.id}-${a.id}`;

          // Idempotência
          const { data: existente } = await supabaseAdmin
            .from("documentos")
            .select("id")
            .eq("gclick_atividade_id", atividadeKey)
            .maybeSingle();
          if (existente) {
            ignorados++;
            continue;
          }

          if (!cnpjT || !byCnpj.has(cnpjT)) {
            pendencias.push({
              tarefa_id: String(t.id),
              atividade_id: String(a.id),
              cliente_nome: t.cliente?.nome,
              cnpj: cnpjT || undefined,
              motivo: cnpjT ? "CNPJ sem cadastro no portal" : "Tarefa sem CNPJ",
            });
            ignorados++;
            continue;
          }

          const perfil = byCnpj.get(cnpjT)!;

          try {
            const baixado = await baixarAnexo(url);
            const ext = (baixado.nomeSugerido.split(".").pop() || "pdf").toLowerCase();
            const path = `${perfil.id}/gclick/${atividadeKey}.${ext}`;

            const { error: upErr } = await supabaseAdmin.storage
              .from("documentos-clientes")
              .upload(path, baixado.bytes, {
                contentType: baixado.contentType,
                upsert: true,
              });
            if (upErr) throw upErr;

            const titulo =
              a.nome || t.nome || baixado.nomeSugerido.replace(/\.[^.]+$/, "");
            const competencia = t.competencia ?? null;
            const venc = t.vencimento ?? t.dataVencimento ?? null;

            const { error: insErr } = await supabaseAdmin
              .from("documentos")
              .insert({
                user_id: perfil.id,
                nome: titulo,
                descricao: t.cliente?.nome ? `G-Click · ${t.cliente.nome}` : "G-Click",
                arquivo_path: path,
                arquivo_url: "",
                tamanho_bytes: baixado.bytes.byteLength,
                mime_type: baixado.contentType,
                origem: "gclick",
                gclick_atividade_id: atividadeKey,
                competencia,
                vencimento: venc,
              });
            if (insErr) throw insErr;
            importados++;
          } catch (e: any) {
            erros++;
            pendencias.push({
              tarefa_id: String(t.id),
              atividade_id: String(a.id),
              cliente_nome: t.cliente?.nome,
              cnpj: cnpjT || undefined,
              motivo: `Erro: ${e?.message ?? "desconhecido"}`.slice(0, 240),
            });
          }
        }
      }

      if (tarefas.length < size) break;
      page++;
      if (page > 50) break; // proteção
    }

    await supabaseAdmin
      .from("gclick_sync_log")
      .update({
        finalizado_em: new Date().toISOString(),
        importados,
        ignorados,
        erros,
        pendencias: pendencias.slice(0, 500),
        mensagem: `OK — ${importados} importados, ${ignorados} ignorados, ${erros} erros`,
      })
      .eq("id", logId);

    return { logId, importados, ignorados, erros, pendencias };
  } catch (e: any) {
    await supabaseAdmin
      .from("gclick_sync_log")
      .update({
        finalizado_em: new Date().toISOString(),
        importados,
        ignorados,
        erros: erros + 1,
        pendencias,
        mensagem: `FALHA: ${e?.message ?? "erro desconhecido"}`,
      })
      .eq("id", logId);
    return { logId, importados, ignorados, erros: erros + 1, pendencias, error: e?.message ?? "erro desconhecido" };
  }
}

export const sincronizarGclick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ diasAtras: z.number().int().min(1).max(180).default(30) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return executarSincronizacao({
      diasAtras: data.diasAtras,
      disparadoPor: context.userId,
    });
  });

export const listarSyncLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await supabaseAdmin
      .from("gclick_sync_log")
      .select("*")
      .order("iniciado_em", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });
