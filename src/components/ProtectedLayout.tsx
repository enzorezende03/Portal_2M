import { Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

export function ProtectedLayout({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, loading, isAdmin, profile } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  if (!user) return <Navigate to="/login" />;
  if (
    profile?.must_reset_password &&
    location.pathname !== "/reset-password"
  ) {
    return <Navigate to="/reset-password" />;
  }
  if (adminOnly && !isAdmin) return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen flex-col md:flex-row" style={{ background: "var(--brand-bg)" }}>
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
