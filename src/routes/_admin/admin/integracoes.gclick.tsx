import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { sincronizarGclick, listarSyncLog } from "@/lib/gclick-sync.functions";

export const Route = createFileRoute("/_admin/admin/integracoes/gclick")({
  component: GclickPage,
});

type LogItem = {
  id: string;
  iniciado_em: string;
  finalizado_em: string | null;
  importados: number;
  ignorados: number;
  erros: number;
  pendencias: Array<{
    tarefa_id: string;
    atividade_id: string;
    cliente_nome?: string;
    cnpj?: string;
    motivo: string;
  }>;
  mensagem: string | null;
};

function mensagemAmigavel(mensagem?: string | null) {
  if (!mensagem) return "—";
  const m = mensagem;
  const lower = m.toLowerCase();
  if (lower.includes("sincronização interrompida")) {
    return "Sincronização interrompida. Rode novamente com um período menor.";
  }
  if (m.includes("invalid_client") || m.includes("[401]")) {
    return "Credenciais do G-Click inválidas. Atualize o Client ID e Client Secret.";
  }
  if (m.includes("Internal Server Error") || m.includes("traceId") || m.includes("[500]")) {
    return "G-Click retornou erro interno. Tente novamente em alguns minutos.";
  }
  if (m.includes("typeMismatch") || m.includes("NotNull") || m.includes("tarefaFiltroDTO")) {
    return "Filtro inválido enviado ao G-Click (categoria). Já foi corrigido — rode novamente.";
  }
  if (m.includes("upstream request timeout") || m.toLowerCase().includes("timeout")) {
    return "A consulta ao G-Click demorou demais. Tente um período menor.";
  }
  if (m.startsWith("FALHA:")) return m.replace(/^FALHA:\s*/, "");
  if (m.startsWith("OK")) return m;
  // fallback: mostra só os primeiros 120 caracteres
  return m.length > 140 ? m.slice(0, 140) + "…" : m;
}

function logTravado(log: LogItem) {
  if (log.finalizado_em) return false;
  return Date.now() - new Date(log.iniciado_em).getTime() > 2 * 60 * 1000;
}

function GclickPage() {
  const sync = useServerFn(sincronizarGclick);
  const fetchLog = useServerFn(listarSyncLog);
  const [dias, setDias] = useState(30);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);

  const load = async () => {
    try {
      const { items } = await fetchLog();
      setLogs(items as unknown as LogItem[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao carregar histórico");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const CATEGORIAS = [
    "Obrigacao",
    "Solicitacao",
    "Cobranca",
    "CertificadoDigital",
  ] as const;

  const rodar = async () => {
    setRunning(true);
    const JANELA = 7; // dias por chamada (G-Click trava em janelas grandes)
    let totImp = 0;
    let totIgn = 0;
    let totErr = 0;
    let falha: string | null = null;
    try {
      for (let offset = 0; offset < dias; offset += JANELA) {
        const janela = Math.min(JANELA, dias - offset);
        for (const categoria of CATEGORIAS) {
          toast.info(
            `Sincronizando ${categoria} (${offset + janela}/${dias} dias)…`,
          );
          try {
            const r = await sync({
              data: { diasAtras: janela, offsetDias: offset, categoria },
            });
            totImp += r.importados ?? 0;
            totIgn += r.ignorados ?? 0;
            totErr += r.erros ?? 0;
            if (r.error && !falha) falha = r.error;
          } catch (e: any) {
            totErr += 1;
            if (!falha) falha = mensagemAmigavel(e?.message);
          }
          load();
        }
      }
      if (falha) toast.error(falha);
      else
        toast.success(
          `Sincronização concluída — ${totImp} importados, ${totIgn} ignorados, ${totErr} erros`,
        );
    } catch (e: any) {
      toast.error(mensagemAmigavel(e?.message ?? "Falha na sincronização"));
    } finally {
      setRunning(false);
      load();
    }
  };

  const ultimo = logs[0];

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>
          Integração G-Click
        </h2>
        <p className="text-sm text-muted-foreground">
          Importa automaticamente as guias finalizadas no G-Click e publica na aba
          Documentação do cliente correto (match por CNPJ).
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Período</span>
            <select
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              className="mt-1 block rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={15}>Últimos 15 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={60}>Últimos 60 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
          </label>
          <button
            onClick={rodar}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "var(--brand-primary)" }}
          >
            <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Sincronizando…" : "Sincronizar agora"}
          </button>
        </div>
      </div>

      {ultimo && (
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <Stat label="Importados" value={ultimo.importados} tone="ok" />
          <Stat label="Ignorados" value={ultimo.ignorados} tone="muted" />
          <Stat label="Erros" value={ultimo.erros} tone={ultimo.erros ? "warn" : "muted"} />
        </div>
      )}

      {ultimo?.pendencias?.length ? (
        <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3 text-sm font-medium">
            Pendências da última sincronização ({ultimo.pendencias.length})
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Cliente (G-Click)</th>
                  <th className="px-3 py-2 font-medium">CNPJ</th>
                  <th className="px-3 py-2 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {ultimo.pendencias.map((p, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">{p.cliente_nome ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.cnpj ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">
          Histórico
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-40" />
              <col className="w-32" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-20" />
              <col />
            </colgroup>
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Quando</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Importados</th>
                <th className="px-3 py-2 font-medium">Ignorados</th>
                <th className="px-3 py-2 font-medium">Erros</th>
                <th className="px-3 py-2 font-medium">Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const travado = logTravado(l);
                return (
                <tr key={l.id} className="border-t border-border align-top">
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {new Date(l.iniciado_em).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {travado ? (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> Interrompida
                      </span>
                    ) : l.finalizado_em ? (
                      l.erros > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="h-3.5 w-3.5" /> Com erros
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Em andamento
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{l.importados}</td>
                  <td className="px-3 py-2">{l.ignorados}</td>
                  <td className="px-3 py-2">{l.erros}</td>
                  <td
                    className="px-3 py-2 text-xs text-muted-foreground truncate"
                    title={l.mensagem ?? ""}
                  >
                    {travado
                      ? "Sincronização interrompida. Rode novamente com um período menor."
                      : mensagemAmigavel(l.mensagem)}
                  </td>
                </tr>
              );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhuma sincronização ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "muted";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
