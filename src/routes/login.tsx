import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/brand";
import { toast } from "sonner";
import { Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { empresa } = useEmpresa();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    nav({ to: "/" });
  };

  const onForgot = async () => {
    if (!email) return toast.error("Informe seu email primeiro");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Email de recuperação enviado");
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Painel decorativo */}
      <div
        className="relative hidden flex-col justify-between p-12 text-white md:flex"
        style={{ background: "var(--brand-primary)" }}
      >
        <div>
          {empresa?.logo_url ? (
            <img src={empresa.logo_url} alt={empresa.nome} className="h-14 w-auto" />
          ) : (
            <div className="font-titulo text-4xl">{empresa?.nome ?? "Portal 2M"}</div>
          )}
        </div>
        <div>
          <p className="font-decorativa text-5xl leading-tight opacity-95">
            Bem-vindo à sua central
          </p>
          <p className="mt-4 max-w-sm text-white/85">
            Tudo o que você precisa da {empresa?.nome ?? "2M"} em um só lugar:
            ferramentas, treinamentos e onboarding guiado.
          </p>
        </div>
        <div className="text-sm text-white/70">© {new Date().getFullYear()} {empresa?.nome ?? "Portal 2M"}</div>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6 md:p-12" style={{ background: "var(--brand-bg)" }}>
        <div className="w-full max-w-sm">
          <h1 className="font-titulo text-3xl" style={{ color: "var(--brand-navy)" }}>
            Entrar na sua conta
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use o email cadastrado pelo seu contador.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 outline-none focus:ring-2"
                style={{ ["--tw-ring-color" as any]: "var(--brand-primary)" }}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Senha</label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 outline-none focus:ring-2"
                style={{ ["--tw-ring-color" as any]: "var(--brand-primary)" }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 font-medium text-white shadow-sm transition-opacity disabled:opacity-60"
              style={{ background: "var(--brand-primary)" }}
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
            <button
              type="button"
              onClick={onForgot}
              className="block w-full text-center text-sm text-muted-foreground hover:underline"
            >
              Esqueci minha senha
            </button>
          </form>

          <div className="mt-10 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Precisa de ajuda?</p>
            <div className="space-y-1.5">
              {empresa?.whatsapp && (
                <a href={`https://wa.me/${empresa.whatsapp.replace(/\D/g, "")}`} className="flex items-center gap-2 hover:text-foreground">
                  <MessageCircle className="h-4 w-4" /> {empresa.whatsapp}
                </a>
              )}
              {empresa?.email_suporte && (
                <a href={`mailto:${empresa.email_suporte}`} className="flex items-center gap-2 hover:text-foreground">
                  <Mail className="h-4 w-4" /> {empresa.email_suporte}
                </a>
              )}
              {!empresa?.whatsapp && !empresa?.email_suporte && (
                <p>Fale com seu contador.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
