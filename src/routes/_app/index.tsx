import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEmpresa } from "@/lib/brand";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, PlayCircle, Megaphone } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  const { profile } = useAuth();
  const { empresa } = useEmpresa();
  const [ferramentas, setFerramentas] = useState<any[]>([]);
  const [treinamentos, setTreinamentos] = useState<any[]>([]);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [onb, setOnb] = useState<{ total: number; done: number }>({ total: 0, done: 0 });

  useEffect(() => {
    (async () => {
      const [{ data: f }, { data: t }, { data: a }, { data: etapas }, { data: prog }] = await Promise.all([
        supabase.from("ferramentas").select("*").eq("ativo", true).order("ordem"),
        supabase.from("treinamentos").select("*").eq("ativo", true).order("created_at", { ascending: false }).limit(4),
        supabase.from("avisos").select("*").eq("ativo", true),
        supabase.from("onboarding_etapas").select("id").eq("ativo", true),
        supabase.from("onboarding_progresso").select("etapa_id, concluido").eq("concluido", true),
      ]);
      setFerramentas(f ?? []);
      setTreinamentos(t ?? []);
      setAvisos(a ?? []);
      setOnb({ total: etapas?.length ?? 0, done: prog?.length ?? 0 });
    })();
  }, []);

  const primeiroNome = profile?.nome?.split(" ")[0] ?? "";
  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const onbPct = onb.total ? Math.round((onb.done / onb.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      {/* Avisos */}
      {avisos.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
          style={{ borderLeftWidth: 4, borderLeftColor: "var(--brand-primary)" }}
        >
          <Megaphone className="mt-0.5 h-5 w-5" style={{ color: "var(--brand-primary)" }} />
          <div>
            <div className="font-medium">{a.titulo}</div>
            <div className="text-sm text-muted-foreground">{a.mensagem}</div>
          </div>
        </div>
      ))}

      {/* Header */}
      <div>
        <h1 className="font-titulo text-4xl" style={{ color: "var(--brand-navy)" }}>
          Olá, {primeiroNome || "bem-vindo(a)"}
        </h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">{dataHoje}</p>
      </div>

      {/* Onboarding */}
      {onb.total > 0 && onb.done < onb.total && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Seu onboarding</div>
              <div className="mt-1 font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>
                Você completou {onb.done} de {onb.total} etapas
              </div>
            </div>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ background: "var(--brand-primary)" }}
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full transition-all"
              style={{ width: `${onbPct}%`, background: "var(--brand-primary)" }}
            />
          </div>
        </div>
      )}

      {/* Ferramentas */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>
            Suas ferramentas
          </h2>
          <Link to="/ferramentas" className="text-sm text-muted-foreground hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {ferramentas.slice(0, 6).map((f) => (
            <a
              key={f.id}
              href={f.url_acesso}
              target={f.abre_em_nova_aba ? "_blank" : "_self"}
              rel="noreferrer"
              className="group rounded-lg border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-white"
                style={{ background: "var(--brand-primary)" }}
              >
                <ExternalLink className="h-5 w-5" />
              </div>
              <div className="font-medium">{f.nome}</div>
              <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{f.descricao}</div>
            </a>
          ))}
          {ferramentas.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhuma ferramenta disponível ainda.
            </div>
          )}
        </div>
      </section>

      {/* Treinamentos */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>
            Últimos treinamentos
          </h2>
          <Link to="/treinamentos" className="text-sm text-muted-foreground hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {treinamentos.map((t) => (
            <Link
              key={t.id}
              to="/treinamentos/$id"
              params={{ id: t.id }}
              className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-video bg-muted">
                {t.thumbnail_url ? (
                  <img src={t.thumbnail_url} alt={t.titulo} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <PlayCircle className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="line-clamp-2 text-sm font-medium">{t.titulo}</div>
              </div>
            </Link>
          ))}
          {treinamentos.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhum treinamento publicado.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
