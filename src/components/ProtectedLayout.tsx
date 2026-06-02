import { Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

export function ProtectedLayout({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, loading, isAdmin, isColaborador, profile } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  if (!user) return <Navigate to="/login" />;
  const emailGeneric =
    !profile?.email ||
    profile.email.toLowerCase().endsWith("@distribuilucros.local") ||
    profile.email.toLowerCase().endsWith(".local");
  const cnpjMissing =
    !profile?.cnpj || profile.cnpj.replace(/\D/g, "").length !== 14;
  const needsCompletion = !isAdmin && !isColaborador && (emailGeneric || cnpjMissing);
  if (
    (profile?.must_reset_password || needsCompletion) &&
    location.pathname !== "/reset-password"
  ) {
    return <Navigate to="/reset-password" />;
  }
  if (adminOnly && !isAdmin && !isColaborador) return <Navigate to="/" />;

  // Colaborador só pode acessar a aba de documentação
  if (
    adminOnly &&
    !isAdmin &&
    isColaborador &&
    location.pathname.startsWith("/admin") &&
    location.pathname !== "/admin/documentacao"
  ) {
    return <Navigate to="/admin/documentacao" />;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row" style={{ background: "var(--brand-bg)" }}>
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
