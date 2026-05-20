import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Users, Wrench, GraduationCap, ListChecks, Megaphone, Building2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin", label: "Visão geral", icon: Building2, exact: true },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/import-clientes", label: "Importar CSV", icon: Upload },
  { to: "/admin/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/admin/treinamentos", label: "Treinamentos", icon: GraduationCap },
  { to: "/admin/onboarding", label: "Onboarding", icon: ListChecks },
  { to: "/admin/avisos", label: "Avisos", icon: Megaphone },
  { to: "/admin/empresas", label: "Empresas", icon: Building2 },
];

export const Route = createFileRoute("/_admin/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--brand-navy)" }} />
        Painel administrativo
      </div>
      <h1 className="font-titulo text-4xl" style={{ color: "var(--brand-navy)" }}>Admin</h1>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                active ? "text-white" : "text-foreground/70 hover:bg-accent"
              )}
              style={active ? { background: "var(--brand-navy)" } : undefined}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
