import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
      const msg = /invalid login credentials/i.test(error.message)
        ? "Email ou senha incorretos"
        : error.message;
      toast.error(msg);
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

  const whatsappLink = empresa?.whatsapp
    ? `https://wa.me/${empresa.whatsapp.replace(/\D/g, "")}`
    : null;
  const mailLink = empresa?.email_suporte ? `mailto:${empresa.email_suporte}` : null;
  const ajudaLink = whatsappLink ?? mailLink;
  const AjudaIcon = whatsappLink ? MessageCircle : Mail;

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Painel esquerdo */}
      <div
        className="relative hidden flex-col items-center justify-center px-12 py-16 text-white md:flex"
        style={{ background: "var(--brand-primary)" }}
      >
        <div className="flex flex-col items-center text-center">
          {empresa?.logo_url ? (
            <img
              src={empresa.logo_url}
              alt={empresa.nome}
              className="h-24 w-auto object-contain"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/15 text-3xl font-semibold">
              {empresa?.nome?.[0] ?? "2"}
            </div>
          )}
          <h1
            className="mt-6 text-4xl tracking-wide"
            style={{ fontFamily: "var(--brand-font-titulo)" }}
          >
            {empresa?.nome ?? "Portal 2M"}
          </h1>
          <p
            className="mt-4 text-4xl leading-tight text-white/95"
            style={{ fontFamily: "var(--brand-font-decorativa)" }}
          >
            Bem-vindo à sua central
          </p>
        </div>
        <div className="absolute bottom-6 text-xs text-white/70">
          © {new Date().getFullYear()} {empresa?.nome ?? "2M"}
        </div>
      </div>

      {/* Lado direito */}
      <div
        className="flex items-center justify-center p-6 md:p-12"
        style={{ background: "var(--brand-bg)" }}
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl md:p-12">
          <h2
            className="text-2xl"
            style={{ color: "var(--brand-navy)", fontFamily: "var(--brand-font-titulo)" }}
          >
            Entrar na sua conta
          </h2>
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
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 outline-none focus:ring-2"
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
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 outline-none focus:ring-2"
                style={{ ["--tw-ring-color" as any]: "var(--brand-primary)" }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-3 font-medium text-white shadow-sm transition-opacity disabled:opacity-60"
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

          <div className="mt-10 border-t border-border pt-4 text-center text-xs text-muted-foreground">
            Precisa de ajuda?{" "}
            {ajudaLink ? (
              <a
                href={ajudaLink}
                className="inline-flex items-center gap-1 hover:underline"
                style={{ color: "var(--brand-primary)" }}
              >
                <AjudaIcon className="h-3.5 w-3.5" /> Fale com a gente
              </a>
            ) : (
              <span>Fale com seu contador.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
