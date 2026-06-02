import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronDown, ChevronUp, CheckCircle2, Circle, ExternalLink, Sparkles, Download, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/onboarding")({
  component: OnboardingPage,
});

type Progresso = { etapa_id: string; concluido: boolean; respostas: any };

function OnboardingPage() {
  const { user } = useAuth();
  const [etapas, setEtapas] = useState<any[]>([]);
  const [progresso, setProgresso] = useState<Record<string, Progresso>>({});
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    const [{ data: e }, { data: p }] = await Promise.all([
      supabase.from("onboarding_etapas").select("*").eq("ativo", true).order("ordem"),
      supabase.from("onboarding_progresso").select("etapa_id, concluido, respostas"),
    ]);
    setEtapas(e ?? []);
    const m: Record<string, Progresso> = {};
    (p ?? []).forEach((x: any) => { m[x.etapa_id] = x; });
    setProgresso(m);
  };

  useEffect(() => { load(); }, []);

  const marcar = async (id: string, respostas?: any) => {
    if (!user) return;
    const payload: any = { user_id: user.id, etapa_id: id, concluido: true, concluido_em: new Date().toISOString() };
    if (respostas !== undefined) payload.respostas = respostas;
    const { error } = await supabase.from("onboarding_progresso").upsert(payload, { onConflict: "user_id,etapa_id" });
    if (error) return toast.error(error.message);
    setProgresso((d) => ({ ...d, [id]: { etapa_id: id, concluido: true, respostas: respostas ?? d[id]?.respostas } }));
    toast.success("Etapa concluída");
  };

  const total = etapas.length;
  const completed = etapas.filter((e) => progresso[e.id]?.concluido).length;
  const allDone = total > 0 && completed === total;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 md:p-10">
      <div
        className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-white"
        style={{ background: "var(--brand-gradient)", boxShadow: "var(--shadow-elegant)" }}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Etapas {completed}/{total}
          </div>
          <h1 className="mt-3 font-titulo text-4xl md:text-5xl leading-tight">Onboarding</h1>
          <p className="mt-2 text-sm text-white/80">
            Avance no seu ritmo — cada etapa concluída fica registrada automaticamente.
          </p>
          {total > 0 && (
            <div className="mt-5 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${Math.round((completed / total) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-white/90">
                {Math.round((completed / total) * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {allDone && (
        <div className="surface-elevated flex items-center gap-3 p-5">
          <Sparkles className="h-6 w-6" style={{ color: "var(--brand-primary)" }} />
          <div>
            <div className="font-titulo text-lg" style={{ color: "var(--brand-navy)" }}>Parabéns! Você concluiu todo o onboarding.</div>
            <div className="text-sm text-muted-foreground">Estamos prontos para trabalhar com você.</div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {etapas.map((e, idx) => {
          const isOpen = open === e.id;
          const isDone = !!progresso[e.id]?.concluido;
          return (
            <div key={e.id} className="overflow-hidden surface">
              <button onClick={() => setOpen(isOpen ? null : e.id)} className="flex w-full items-center gap-3 p-4 text-left">
                {isDone ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Etapa {idx + 1} de {total}</div>
                  <div className="font-medium">{e.titulo}</div>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {isOpen && (
                <div className="border-t border-border p-5">
                  {e.descricao && <p className="mb-4 text-sm text-muted-foreground">{e.descricao}</p>}
                  <EtapaConteudo
                    etapa={e}
                    isDone={isDone}
                    respostasSalvas={progresso[e.id]?.respostas}
                    onConcluir={(respostas?: any) => marcar(e.id, respostas)}
                  />
                </div>
              )}
            </div>
          );
        })}
        {total === 0 && (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Nenhuma etapa de onboarding configurada.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Vídeo ----------
function detectVideo(url: string) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  if (url.includes("iframe.mediadelivery.net")) return url;
  return url;
}

function brandBtn(extra = "") {
  return `inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white ${extra}`;
}

function EtapaConteudo({
  etapa, isDone, respostasSalvas, onConcluir,
}: {
  etapa: any;
  isDone: boolean;
  respostasSalvas: any;
  onConcluir: (respostas?: any) => void;
}) {
  const c = etapa.conteudo ?? {};

  switch (etapa.tipo) {
    case "video": {
      const embed = detectVideo(c.url ?? "");
      return (
        <div>
          {embed && (
            <div className="aspect-video overflow-hidden rounded-lg bg-black">
              <iframe src={embed} allowFullScreen className="h-full w-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" />
            </div>
          )}
          {!isDone && (
            <button onClick={() => onConcluir()} className={brandBtn("mt-5")} style={{ background: "var(--brand-primary)" }}>
              Marcar como concluída
            </button>
          )}
        </div>
      );
    }

    case "checklist":
      return <ChecklistEtapa items={c.items ?? c.itens ?? []} isDone={isDone} onConcluir={onConcluir} />;

    case "formulario":
      return <FormularioEtapa campos={c.campos ?? []} respostasSalvas={respostasSalvas} isDone={isDone} onConcluir={onConcluir} />;

    case "link":
      return (
        <div className="space-y-4">
          <a href={c.url} target="_blank" rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg p-6 text-base font-medium text-white shadow-sm transition hover:opacity-90"
            style={{ background: "var(--brand-primary)" }}>
            <LinkIcon className="h-5 w-5" />
            {c.label ?? "Acessar link"}
          </a>
          {!isDone && (
            <button onClick={() => onConcluir()} className="text-sm underline text-muted-foreground">
              Marcar como concluída
            </button>
          )}
        </div>
      );

    case "documento":
      return (
        <div className="space-y-4">
          <a href={c.arquivo_url ?? c.url} target="_blank" rel="noreferrer" download
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-base font-medium transition hover:bg-accent"
            style={{ borderColor: "var(--brand-primary)", color: "var(--brand-navy)" }}>
            <Download className="h-5 w-5" />
            {c.label ?? "Baixar documento"}
          </a>
          {!isDone && (
            <button onClick={() => onConcluir()} className="text-sm underline text-muted-foreground">
              Marcar como concluída
            </button>
          )}
        </div>
      );

    default:
      return (
        !isDone ? (
          <button onClick={() => onConcluir()} className={brandBtn("mt-2")} style={{ background: "var(--brand-primary)" }}>
            Marcar como concluída
          </button>
        ) : null
      );
  }
}

function ChecklistEtapa({ items, isDone, onConcluir }: { items: string[]; isDone: boolean; onConcluir: () => void }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const allChecked = items.length > 0 && items.every((_, i) => checked[i]);

  return (
    <div>
      <ul className="space-y-2">
        {items.map((it: string, i: number) => (
          <li key={i}>
            <label className="flex cursor-pointer items-center gap-3 rounded-md p-2 text-sm hover:bg-accent">
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={(e) => setChecked((s) => ({ ...s, [i]: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
                style={{ accentColor: "var(--brand-primary)" }}
              />
              <span className={checked[i] ? "line-through text-muted-foreground" : ""}>{it}</span>
            </label>
          </li>
        ))}
      </ul>
      {!isDone && (
        <button onClick={onConcluir} disabled={!allChecked}
          className={brandBtn("mt-5 disabled:opacity-50 disabled:cursor-not-allowed")}
          style={{ background: "var(--brand-primary)" }}>
          Marcar como concluída
        </button>
      )}
    </div>
  );
}

type Campo = { label: string; tipo: string; obrigatorio?: boolean };

function FormularioEtapa({
  campos, respostasSalvas, isDone, onConcluir,
}: { campos: Campo[]; respostasSalvas: any; isDone: boolean; onConcluir: (respostas: any) => void }) {
  const initial = useMemo(() => respostasSalvas ?? {}, [respostasSalvas]);
  const [valores, setValores] = useState<Record<string, any>>(initial);

  useEffect(() => { setValores(initial); }, [initial]);

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    for (const c of campos) {
      if (c.obrigatorio && !String(valores[c.label] ?? "").trim()) {
        toast.error(`Preencha "${c.label}"`);
        return;
      }
    }
    onConcluir(valores);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {campos.map((c, i) => {
        const v = valores[c.label] ?? "";
        const set = (val: any) => setValores((s) => ({ ...s, [c.label]: val }));
        const base = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2";
        const ringStyle = { ["--tw-ring-color" as any]: "var(--brand-primary)" };
        return (
          <div key={i} className="grid gap-1.5">
            <label className="text-sm font-medium">
              {c.label} {c.obrigatorio && <span className="text-destructive">*</span>}
            </label>
            {c.tipo === "textarea" ? (
              <textarea rows={3} value={v} onChange={(e) => set(e.target.value)} className={base} style={ringStyle} disabled={isDone} />
            ) : c.tipo === "checkbox" ? (
              <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} className="h-4 w-4" style={{ accentColor: "var(--brand-primary)" }} disabled={isDone} />
            ) : (
              <input type={c.tipo || "text"} value={v} onChange={(e) => set(e.target.value)} className={base} style={ringStyle} disabled={isDone} />
            )}
          </div>
        );
      })}
      {!isDone && (
        <button type="submit" className={brandBtn("")} style={{ background: "var(--brand-primary)" }}>
          Enviar e concluir
        </button>
      )}
      {isDone && <p className="text-sm text-muted-foreground">Respostas salvas.</p>}
    </form>
  );
}
