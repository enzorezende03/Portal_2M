import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Wrench, GraduationCap, ListChecks, User, LogOut, Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { useEmpresa } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/treinamentos", label: "Treinamentos", icon: GraduationCap },
  { to: "/onboarding", label: "Onboarding", icon: ListChecks },
  { to: "/perfil", label: "Perfil", icon: User },
];

export function Sidebar() {
  const { empresa } = useEmpresa();
  const { profile, isAdmin, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    nav({ to: "/login" });
  };

  const NavContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border/60 p-6">
        {empresa?.logo_url ? (
          <img src={empresa.logo_url} alt={empresa.nome} className="h-10 w-auto" />
        ) : (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg font-titulo text-lg text-white"
            style={{ background: "var(--brand-primary)" }}
          >
            2M
          </div>
        )}
        <div>
          <div className="font-titulo text-lg leading-none" style={{ color: "var(--brand-navy)" }}>
            {empresa?.nome ?? "Portal 2M"}
          </div>
          <div className="text-xs text-muted-foreground">Portal do Cliente</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map((it) => {
          const active = path === it.to;
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-white shadow-sm"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground"
              )}
              style={active ? { background: "var(--brand-primary)" } : undefined}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            onClick={() => setOpen(false)}
            className={cn(
              "mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              path.startsWith("/admin")
                ? "text-white"
                : "text-foreground/70 hover:bg-accent hover:text-foreground"
            )}
            style={path.startsWith("/admin") ? { background: "var(--brand-navy)" } : undefined}
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}
      </nav>

      <div className="border-t border-border/60 p-4">
        <div className="mb-3 px-3">
          <div className="truncate text-sm font-medium">{profile?.nome ?? "—"}</div>
          <div className="truncate text-xs text-muted-foreground">{profile?.email}</div>
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
