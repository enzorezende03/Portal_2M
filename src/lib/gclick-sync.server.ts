// Server-only: lógica pesada da sincronização G-Click.
// Nunca importar de código de cliente.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  listarTarefasGclick,
  listarAtividadesPorTarefa,
  extrairAnexo,
  baixarAnexo,
  onlyDigits,
  type GclickAtividade,
} from "./gclick.server";

export type Pendencia = {
  tarefa_id: string;
  atividade_id: string;
  cliente_nome?: string;
  cnpj?: string;
  motivo: string;
};

export function mensagemAmigavelGclick(message?: string) {
  const texto = message ?? "erro desconhecido";
  if (texto.includes("invalid_client") || texto.includes("401")) {
    return "Credenciais do G-Click inválidas. Atualize o Client ID e Client Secret da integração.";
  }
  if (
    texto.includes("Internal Server Error") ||
    texto.includes("traceId") ||
    texto.includes("[500]")
  ) {
    return "O G-Click retornou erro interno ao autenticar. Tente novamente em alguns minutos.";
  }
  return texto;
}

const CATEGORIAS = ["Obrigacao", "Solicitacao", "Cobranca", "CertificadoDigital"] as const;
export type GclickCategoriaSync = (typeof CATEGORIAS)[number];

export async function executarSincronizacao(opts: {
  diasAtras: number;
  offsetDias?: number;
  disparadoPor?: string | null;
  logId?: string;
  categoria?: GclickCategoriaSync; // se ausente, processa todas
}) {
  const offset = opts.offsetDias ?? 0;
  const ate = new Date();
  ate.setDate(ate.getDate() - offset);
  const de = new Date();
  de.setDate(de.getDate() - offset - opts.diasAtras);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  let logId = opts.logId;
  if (!logId) {
    const { data: logRow, error: logErr } = await supabaseAdmin
      .from("gclick_sync_log")
      .insert({ disparado_por: opts.disparadoPor ?? null })
      .select()
      .single();
    if (logErr) throw new Error(logErr.message);
    logId = (logRow as any).id as string;
  }

  let importados = 0;
  let ignorados = 0;
  let erros = 0;
  const pendencias: Pendencia[] = [];
  let totTarefas = 0;
  let totAtividades = 0;
  let totComAnexo = 0;
  let totConcluidas = 0;
  let amostraAtividade: string | null = null;
  let amostraTarefa: string | null = null;
  let mensagemAnterior = "";

  if (opts.logId) {
    const { data: logAtual } = await supabaseAdmin
      .from("gclick_sync_log")
      .select("importados, ignorados, erros, pendencias, mensagem")
      .eq("id", logId)
      .maybeSingle();
    importados = Number((logAtual as any)?.importados ?? 0);
    ignorados = Number((logAtual as any)?.ignorados ?? 0);
    erros = Number((logAtual as any)?.erros ?? 0);
    if (Array.isArray((logAtual as any)?.pendencias)) {
      pendencias.push(...((logAtual as any).pendencias as Pendencia[]));
    }
    mensagemAnterior = String((logAtual as any)?.mensagem ?? "");
  }

  try {
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, cnpj, email, nome");
    type Perfil = { id: string; nome: string | null };
    const byCnpj = new Map<string, Perfil>();
    const byEmail = new Map<string, Perfil>();
    const byNome = new Map<string, Perfil>();
    const normNome = (s?: string | null) =>
      String(s ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    for (const p of profiles ?? []) {
      const entry: Perfil = { id: (p as any).id, nome: (p as any).nome };
      const k = onlyDigits((p as any).cnpj);
      if (k) byCnpj.set(k, entry);
      const em = ((p as any).email ?? "").trim().toLowerCase();
      if (em) byEmail.set(em, entry);
      const nm = normNome((p as any).nome);
      if (nm) byNome.set(nm, entry);
    }

    const categorias = opts.categoria ? [opts.categoria] : [...CATEGORIAS];

    for (const categoria of categorias) {
      let page = 0;
      const size = 100;
      while (true) {
        const tarefas = await listarTarefasGclick({
          dataInicio: fmt(de),
          dataFim: fmt(ate),
          page,
          size,
          categoria,
        });
        if (tarefas.length === 0) break;
        totTarefas += tarefas.length;

        for (const t of tarefas) {
          if (!amostraTarefa) {
            amostraTarefa = JSON.stringify(Object.keys(t)).slice(0, 200);
          }
          const cliente = (t.cliente ?? {}) as any;
          const clienteNome =
            cliente.nome ??
            cliente.apelido ??
            t.clienteNome ??
            t.clienteApelido ??
            (t as any).clienteRazaoSocial ??
            null;
          const cnpjT = onlyDigits(
            cliente.cnpj ??
              cliente.inscricao ??
              t.clienteInscricao ??
              (t as any).clienteCnpj ??
              (t as any).clienteDocumento ??
              (t as any).cnpj ??
              (t as any).inscricao,
          );
          const emailT = String(cliente.email ?? t.clienteEmail ?? (t as any).emailCliente ?? "")
            .trim()
            .toLowerCase();
          const nomeT = normNome(clienteNome);
          const perfilMatch: Perfil | undefined =
            (cnpjT && byCnpj.get(cnpjT)) ||
            (emailT && byEmail.get(emailT)) ||
            (nomeT && byNome.get(nomeT)) ||
            undefined;
          const atividades = await listarAtividadesPorTarefa(t.id).catch(
            () => [] as GclickAtividade[],
          );
          totAtividades += atividades.length;

          for (const a of atividades) {
            if (!amostraAtividade && atividades.length > 0) {
              amostraAtividade = JSON.stringify(a).slice(0, 600);
            }
            const anexo = extrairAnexo(a);
            const url = anexo?.url ?? null;
            const concluida =
              a.respondida === true ||
              a.concluido === true ||
              !!a.respondidaEm ||
              /conclu|finaliz|efetuad|respond/i.test(a.status ?? "");
            if (url) totComAnexo++;
            if (concluida) totConcluidas++;
            if (!url || !concluida) continue;

            const atividadeKey = `${t.id}-${a.id}`;

            const { data: existente } = await supabaseAdmin
              .from("documentos")
              .select("id")
              .eq("gclick_atividade_id", atividadeKey)
              .maybeSingle();
            if (existente) {
              ignorados++;
              continue;
            }

            if (!perfilMatch) {
              const motivo = cnpjT
                ? "CNPJ sem cadastro no portal (e sem match por email/nome)"
                : emailT
                  ? "Email do cliente sem cadastro no portal"
                  : nomeT
                    ? "Cliente sem match por nome no portal"
                    : "Tarefa sem identificação de cliente";
              pendencias.push({
                tarefa_id: String(t.id),
                atividade_id: String(a.id),
                cliente_nome: clienteNome ?? undefined,
                cnpj: cnpjT || undefined,
                motivo,
              });
              ignorados++;
              continue;
            }

            const perfil = perfilMatch;

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

              const titulo = a.nome || t.nome || baixado.nomeSugerido.replace(/\.[^.]+$/, "");
              const competencia = t.competencia ?? null;
              const venc = t.vencimento ?? t.dataVencimento ?? null;

              const { error: insErr } = await supabaseAdmin.from("documentos").insert({
                user_id: perfil.id,
                nome: titulo,
                descricao: clienteNome ? `G-Click · ${clienteNome}` : "G-Click",
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
        if (page > 50) break;
      }
    }

    const resumoAtual = `${opts.categoria ? `${opts.categoria}: ` : ""}${totTarefas} tarefas, ${totAtividades} atividades (${totConcluidas} concluídas, ${totComAnexo} c/ anexo)`;
    await supabaseAdmin
      .from("gclick_sync_log")
      .update({
        finalizado_em: new Date().toISOString(),
        importados,
        ignorados,
        erros,
        pendencias: pendencias.slice(0, 500),
        mensagem: `OK — ${mensagemAnterior ? `${mensagemAnterior.replace(/^OK —\s*/, "")} | ` : ""}${resumoAtual} · ${importados} importados, ${ignorados} ignorados, ${erros} erros${amostraAtividade ? ` · AMOSTRA_ATV: ${amostraAtividade}` : ""}${amostraTarefa ? ` · CAMPOS_TAR: ${amostraTarefa}` : ""}`,
      })
      .eq("id", logId);

    return { logId, importados, ignorados, erros, pendencias, error: null as string | null };
  } catch (e: any) {
    const mensagem = mensagemAmigavelGclick(e?.message);
    await supabaseAdmin
      .from("gclick_sync_log")
      .update({
        finalizado_em: new Date().toISOString(),
        importados,
        ignorados,
        erros: erros + 1,
        pendencias,
        mensagem: `FALHA: ${mensagem}`,
      })
      .eq("id", logId);
    return {
      logId,
      importados,
      ignorados,
      erros: erros + 1,
      pendencias,
      error: mensagem,
    };
  }
}
