import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { openWithSso } from "@/lib/sso";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ExternalLink, PlayCircle, Megaphone } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function useFerramentas() {
  return useQuery({
    queryKey: ["dashboard", "ferramentas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ferramentas")
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useTreinamentos() {
  return useQuery({
    queryKey: ["dashboard", "treinamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treinamentos")
        .select("*")
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useAvisos() {
  return useQuery({
    queryKey: ["dashboard", "avisos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avisos")
        .select("*")
        .eq("ativo", true);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useOnboardingProgress() {
  return useQuery({
    queryKey: ["dashboard", "onboarding-progress"],
    queryFn: async () => {
      const [{ data: etapas, error: e1 }, { data: prog, error: e2 }] = await Promise.all([
        supabase.from("onboarding_etapas").select("id").eq("ativo", true),
        supabase
          .from("onboarding_progresso")
          .select("etapa_id, concluido")
          .eq("concluido", true),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { total: etapas?.length ?? 0, done: prog?.length ?? 0 };
    },
  });
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <Skeleton className="mb-3 h-10 w-10 rounded-lg" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-2 h-3 w-full" />
      <Skeleton className="mt-1 h-3 w-4/5" />
    </div>
  );
}

function VideoSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-3">
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function Dashboard() {
  const { profile } = useAuth();
  const ferramentasQ = useFerramentas();
  const treinamentosQ = useTreinamentos();
  const avisosQ = useAvisos();
  const onbQ = useOnboardingProgress();

  const primeiroNome = profile?.nome?.split(" ")[0] ?? "";
  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const onb = onbQ.data ?? { total: 0, done: 0 };
  const onbPct = onb.total ? Math.round((onb.done / onb.total) * 100) : 0;

  async function handleFerramentaClick(e: React.MouseEvent, f: any) {
    if (!f.requer_sso) return;
    e.preventDefault();
    await openWithSso(f.url_acesso, f.abre_em_nova_aba);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      {/* Avisos */}
      {(avisosQ.data ?? []).map((a: any) => (
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
      {onbQ.isLoading ? (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-7 w-2/3" />
          <Skeleton className="mt-4 h-2 w-full rounded-full" />
        </div>
      ) : onb.total > 0 && onb.done < onb.total ? (
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
      ) : null}

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
          {ferramentasQ.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (ferramentasQ.data ?? []).length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhuma ferramenta disponível ainda.
            </div>
          ) : (
            (ferramentasQ.data ?? []).slice(0, 6).map((f: any) => (
              <a
                key={f.id}
                href={f.url_acesso}
                target={f.abre_em_nova_aba ? "_blank" : "_self"}
                rel="noreferrer"
                onClick={(e) => handleFerramentaClick(e, f)}
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
            ))
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
          {treinamentosQ.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <VideoSkeleton key={i} />)
          ) : (treinamentosQ.data ?? []).length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhum treinamento publicado.
            </div>
          ) : (
            (treinamentosQ.data ?? []).map((t: any) => (
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
            ))
          )}
        </div>
      </section>
    </div>
  );
}
