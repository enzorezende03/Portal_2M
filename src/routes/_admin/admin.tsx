import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Users, Wrench, GraduationCap, ListChecks, Megaphone, Building2, Upload, FileText, Plug } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { VerComoSelector } from "@/components/VerComoSelector";

const tabs = [
  { to: "/admin", label: "Visão geral", icon: Building2, exact: true, adminOnly: true },
  { to: "/admin/clientes", label: "Clientes", icon: Users, adminOnly: true },
  { to: "/admin/import-clientes", label: "Importar CSV", icon: Upload, adminOnly: true },
  { to: "/admin/ferramentas", label: "Ferramentas", icon: Wrench, adminOnly: true },
  { to: "/admin/treinamentos", label: "Treinamentos", icon: GraduationCap, adminOnly: true },
  { to: "/admin/documentacao", label: "Documentação", icon: FileText, adminOnly: false },
  { to: "/admin/integracoes/gclick", label: "G-Click", icon: Plug, adminOnly: true },
  { to: "/admin/onboarding", label: "Onboarding", icon: ListChecks, adminOnly: true },
  { to: "/admin/avisos", label: "Avisos", icon: Megaphone, adminOnly: true },
  { to: "/admin/empresas", label: "Empresas", icon: Building2, adminOnly: true },
];

export const Route = createFileRoute("/_admin/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin } = useAuth();
  const visibleTabs = tabs.filter((t) => isAdmin || !t.adminOnly);
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      {/* Hero header */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-white"
        style={{ background: "var(--brand-gradient)", boxShadow: "var(--shadow-elegant)" }}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {isAdmin ? "Painel administrativo" : "Painel do colaborador"}
            </div>
            <h1 className="mt-3 font-titulo text-4xl md:text-5xl leading-tight">
              {isAdmin ? "Admin" : "Documentos dos clientes"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              {isAdmin
                ? "Gerencie clientes, ferramentas, treinamentos, avisos e integrações."
                : "Visualize e gerencie a documentação enviada aos clientes."}
            </p>
          </div>
          {isAdmin && <VerComoSelector />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
        {visibleTabs.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
                active ? "text-white shadow-sm" : "text-foreground/70 hover:bg-accent"
              )}
              style={active ? { background: "var(--brand-gradient)", boxShadow: "var(--brand-glow)" } : undefined}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </div>

      <div>
        <Outlet />
      </div>
    </div>
  );
}
