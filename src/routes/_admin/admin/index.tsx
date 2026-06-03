import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Wrench,
  GraduationCap,
  Megaphone,
  Upload,
  FileText,
  Plug,
  ListChecks,
  Building2,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_admin/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const [stats, setStats] = useState({ clientes: 0, ferramentas: 0, treinamentos: 0, avisos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, f, t, a] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("ferramentas").select("id", { count: "exact", head: true }),
        supabase.from("treinamentos").select("id", { count: "exact", head: true }),
        supabase.from("avisos").select("id", { count: "exact", head: true }).eq("ativo", true),
      ]);
      setStats({
        clientes: p.count ?? 0,
        ferramentas: f.count ?? 0,
        treinamentos: t.count ?? 0,
        avisos: a.count ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    {
      label: "Clientes",
      value: stats.clientes,
      icon: Users,
      to: "/admin/clientes",
      hint: "Gerenciar contas",
    },
    {
      label: "Ferramentas",
      value: stats.ferramentas,
      icon: Wrench,
      to: "/admin/ferramentas",
      hint: "Catálogo de acessos",
    },
    {
      label: "Treinamentos",
      value: stats.treinamentos,
      icon: GraduationCap,
      to: "/admin/treinamentos",
      hint: "Vídeos publicados",
    },
    {
      label: "Avisos ativos",
      value: stats.avisos,
      icon: Megaphone,
      to: "/admin/avisos",
      hint: "Comunicados no ar",
    },
  ];

  const quickActions = [
    { to: "/admin/import-clientes", label: "Importar clientes", desc: "Subir CSV em lote", icon: Upload },
    { to: "/admin/documentacao", label: "Documentação", desc: "Enviar documentos", icon: FileText },
    { to: "/admin/integracoes/gclick", label: "G-Click", desc: "Sincronizar integração", icon: Plug },
    { to: "/admin/onboarding", label: "Onboarding", desc: "Acompanhar etapas", icon: ListChecks },
    { to: "/admin/empresas", label: "Empresas", desc: "Cadastros gerais", icon: Building2 },
    { to: "/admin/avisos", label: "Novo aviso", desc: "Publicar comunicado", icon: Megaphone },
  ];

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="group surface card-hover relative overflow-hidden p-5"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: "var(--brand-gradient)", filter: "blur(40px)" }}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {c.label}
                </div>
                <div
                  className="mt-2 font-titulo text-4xl tabular-nums"
                  style={{ color: "var(--brand-navy)" }}
                >
                  {loading ? (
                    <span className="inline-block h-9 w-16 animate-pulse rounded-md bg-muted" />
                  ) : (
                    c.value.toLocaleString("pt-BR")
                  )}
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  {c.hint}
                  <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
              <div className="icon-tile h-11 w-11 shrink-0">
                <c.icon className="h-5 w-5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2
              className="font-titulo text-2xl"
              style={{ color: "var(--brand-navy)" }}
            >
              Atalhos rápidos
            </h2>
            <p className="text-sm text-muted-foreground">
              Acesse rapidamente as principais tarefas administrativas.
            </p>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground sm:inline-flex">
            <TrendingUp className="h-3.5 w-3.5" />
            Painel atualizado em tempo real
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="surface card-hover group flex items-center gap-4 p-4"
            >
              <div className="icon-tile h-11 w-11 shrink-0">
                <q.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">{q.label}</div>
                <div className="text-xs text-muted-foreground">{q.desc}</div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
