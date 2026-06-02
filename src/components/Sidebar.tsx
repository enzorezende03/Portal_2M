import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Wrench, GraduationCap, ListChecks, User, LogOut, Shield, Menu, X, FileText } from "lucide-react";
import { useState } from "react";
import { useEmpresa } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/treinamentos", label: "Treinamentos", icon: GraduationCap },
  { to: "/documentacao", label: "Documentação", icon: FileText },
  { to: "/onboarding", label: "Onboarding", icon: ListChecks },
  { to: "/perfil", label: "Perfil", icon: User },
];

export function Sidebar() {
  const { empresa } = useEmpresa();
  const { profile, isAdmin, isColaborador, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    nav({ to: "/login" });
  };

  const NavContent = (
    <div className="flex h-full flex-col">
      <div
        className="relative overflow-hidden border-b border-border/60 px-6 py-7"
        style={{ background: "var(--brand-gradient)" }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-3">
          {empresa?.logo_url ? (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 p-1.5 shadow-md">
              <img src={empresa.logo_url} alt={empresa.nome} className="h-full w-auto object-contain" />
            </div>
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 font-titulo text-xl text-white backdrop-blur">
              2M
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-titulo text-lg leading-tight text-white">
              {empresa?.nome ?? "Portal 2M"}
            </div>
            <div className="text-xs text-white/70">Portal do Cliente</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((it) => {
          const active = path === it.to;
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={() => setOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "text-white shadow-sm"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground"
              )}
              style={active ? { background: "var(--brand-gradient)", boxShadow: "var(--brand-glow)" } : undefined}
            >
              <it.icon className={cn("h-4 w-4 transition-transform", !active && "group-hover:scale-110")} />
              {it.label}
            </Link>
          );
        })}
        {(isAdmin || isColaborador) && (
          <Link
            to={isAdmin ? "/admin" : "/admin/documentacao"}
            onClick={() => setOpen(false)}
            className={cn(
              "mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              path.startsWith("/admin")
                ? "text-white shadow-sm"
                : "text-foreground/70 hover:bg-accent hover:text-foreground"
            )}
            style={path.startsWith("/admin") ? { background: "var(--brand-navy)", boxShadow: "var(--brand-glow)" } : undefined}
          >
            <Shield className="h-4 w-4" />
            {isAdmin ? "Admin" : "Documentos dos clientes"}
          </Link>
        )}
      </nav>

      <div className="border-t border-border/60 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ background: "var(--brand-gradient)" }}
          >
            {(profile?.nome?.[0] ?? profile?.email?.[0] ?? "?").toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{profile?.nome ?? "—"}</div>
            <div className="truncate text-xs text-muted-foreground">{profile?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-card px-4 py-3 md:hidden">
        <div className="font-titulo text-lg" style={{ color: "var(--brand-navy)" }}>
          {empresa?.nome ?? "Portal 2M"}
        </div>
        <button onClick={() => setOpen(true)} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/60 bg-card md:block">
        {NavContent}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-card shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 p-2" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
            {NavContent}
          </div>
        </div>
      )}
    </>
  );
}
