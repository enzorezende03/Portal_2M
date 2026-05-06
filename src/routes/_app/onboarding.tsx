import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronDown, ChevronUp, CheckCircle2, Circle, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user } = useAuth();
  const [etapas, setEtapas] = useState<any[]>([]);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    const [{ data: e }, { data: p }] = await Promise.all([
      supabase.from("onboarding_etapas").select("*").eq("ativo", true).order("ordem"),
      supabase.from("onboarding_progresso").select("etapa_id, concluido"),
    ]);
    setEtapas(e ?? []);
    const m: Record<string, boolean> = {};
    (p ?? []).forEach((x: any) => x.concluido && (m[x.etapa_id] = true));
    setDone(m);
  };

  useEffect(() => { load(); }, []);

  const marcar = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("onboarding_progresso").upsert(
      { user_id: user.id, etapa_id: id, concluido: true, concluido_em: new Date().toISOString() },
      { onConflict: "user_id,etapa_id" }
    );
    if (error) return toast.error(error.message);
    setDone((d) => ({ ...d, [id]: true }));
    toast.success("Etapa concluída");
  };

  const total = etapas.length;
  const completed = etapas.filter((e) => done[e.id]).length;
  const allDone = total > 0 && completed === total;

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10">
      <h1 className="font-titulo text-4xl" style={{ color: "var(--brand-navy)" }}>Onboarding</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Você completou {completed} de {total} etapas.
      </p>

      {allDone && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-card p-5 shadow-sm">
          <Sparkles className="h-6 w-6" style={{ color: "var(--brand-primary)" }} />
          <div>
            <div className="font-titulo text-lg" style={{ color: "var(--brand-navy)" }}>
              Parabéns! Você concluiu todo o onboarding.
            </div>
            <div className="text-sm text-muted-foreground">Estamos prontos para trabalhar com você.</div>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {etapas.map((e, idx) => {
          const isOpen = open === e.id;
          const isDone = done[e.id];
          return (
            <div key={e.id} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <button
                onClick={() => setOpen(isOpen ? null : e.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">Etapa {idx + 1} de {total}</div>
                  <div className="font-medium">{e.titulo}</div>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {isOpen && (
                <div className="border-t border-border p-5">
                  {e.descricao && <p className="mb-4 text-sm text-muted-foreground">{e.descricao}</p>}
                  <EtapaConteudo etapa={e} />
                  {!isDone && (
                    <button
                      onClick={() => marcar(e.id)}
                      className="mt-5 rounded-lg px-4 py-2 text-sm font-medium text-white"
                      style={{ background: "var(--brand-primary)" }}
                    >
                      Marcar como concluída
                    </button>
                  )}
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

function EtapaConteudo({ etapa }: { etapa: any }) {
  const c = etapa.conteudo ?? {};
  switch (etapa.tipo) {
    case "video":
      return c.url ? (
        <div className="aspect-video overflow-hidden rounded-lg bg-black">
          <iframe src={c.url} allowFullScreen className="h-full w-full" />
        </div>
      ) : null;
    case "checklist":
      return (
        <ul className="space-y-2">
          {(c.itens ?? []).map((it: string, i: number) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Circle className="h-4 w-4 text-muted-foreground" /> {it}
            </li>
          ))}
        </ul>
      );
    case "link":
    case "documento":
      return c.url ? (
        <a
          href={c.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
        >
          <ExternalLink className="h-4 w-4" /> {c.label ?? "Acessar"}
        </a>
      ) : null;
    case "formulario":
      return <p className="text-sm text-muted-foreground">Formulário disponível.</p>;
    default:
      return null;
  }
}
