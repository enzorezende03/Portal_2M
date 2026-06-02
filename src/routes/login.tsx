import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/brand";
import { resolveEmailByCnpj } from "@/lib/cnpj-login.functions";
import { toast } from "sonner";
import { Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type LoginMode = "email" | "cnpj";

function formatCnpj(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function LoginPage() {
  const { empresa } = useEmpresa();
  const nav = useNavigate();
  const resolveCnpj = useServerFn(resolveEmailByCnpj);
  const [mode, setMode] = useState<LoginMode>("email");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let loginEmail = email;
      if (mode === "cnpj") {
        const { email: resolved } = await resolveCnpj({ data: { cnpj } });
        loginEmail = resolved;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: senha,
      });
      if (error) {
        const msg = /invalid login credentials/i.test(error.message)
          ? "Credenciais incorretas"
          : error.message;
        toast.error(msg);
        return;
      }
      nav({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao entrar");
    } finally {
      setLoading(false);
    }
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
        className="relative hidden flex-col items-center justify-center overflow-hidden px-12 py-16 text-white md:flex"
        style={{ background: "var(--brand-gradient)" }}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex flex-col items-center text-center">
          {empresa?.logo_url ? (
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white/95 p-3 shadow-xl">
              <img src={empresa.logo_url} alt={empresa.nome} className="h-full w-auto object-contain" />
            </div>
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white/15 text-4xl font-semibold backdrop-blur ring-1 ring-white/20">
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
            className="mt-3 text-4xl leading-tight text-white/95"
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
      <div className="flex items-center justify-center p-6 md:p-12">
        <div
          className="w-full max-w-md rounded-3xl bg-white p-8 md:p-12"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <h2
            className="text-2xl"
            style={{ color: "var(--brand-navy)", fontFamily: "var(--brand-font-titulo)" }}
          >
            Entrar na sua conta
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre com seu email ou CNPJ.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("email")}
              className={`rounded-md py-2 font-medium transition ${
                mode === "email" ? "bg-white shadow-sm" : "text-muted-foreground"
              }`}
              style={mode === "email" ? { color: "var(--brand-navy)" } : undefined}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setMode("cnpj")}
              className={`rounded-md py-2 font-medium transition ${
                mode === "cnpj" ? "bg-white shadow-sm" : "text-muted-foreground"
              }`}
              style={mode === "cnpj" ? { color: "var(--brand-navy)" } : undefined}
            >
              CNPJ
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "email" ? (
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
            ) : (
              <div>
                <label className="text-sm font-medium">CNPJ</label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 outline-none focus:ring-2"
                  style={{ ["--tw-ring-color" as any]: "var(--brand-primary)" }}
                />
              </div>
            )}
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
