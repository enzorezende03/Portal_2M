import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { completeFirstLoginProfile } from "@/lib/complete-profile.functions";
import { maskCnpj } from "@/lib/masks";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function isGenericEmail(email: string | null | undefined) {
  if (!email) return true;
  const e = email.toLowerCase();
  return e.endsWith("@distribuilucros.local") || e.endsWith(".local");
}
function isMissingCnpj(cnpj: string | null | undefined) {
  if (!cnpj) return true;
  return cnpj.replace(/\D/g, "").length !== 14;
}

function ResetPassword() {
  const nav = useNavigate();
  const { user, profile, refresh } = useAuth();
  const completeProfile = useServerFn(completeFirstLoginProfile);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const forced = !!profile?.must_reset_password;
  const needsEmail = useMemo(() => isGenericEmail(profile?.email), [profile?.email]);
  const needsCnpj = useMemo(() => isMissingCnpj(profile?.cnpj), [profile?.cnpj]);
  const needsCompletion = needsEmail || needsCnpj;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password only when still required
    if (forced) {
      if (pw.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");
      if (pw !== pw2) return toast.error("As senhas não coincidem");
      if (pw === "2m_Brand")
        return toast.error("Escolha uma senha diferente da senha inicial");
    }

    if (needsEmail && !email) return toast.error("Informe seu email");
    if (needsCnpj && cnpj.replace(/\D/g, "").length !== 14)
      return toast.error("Informe um CNPJ válido");

    setSaving(true);
    try {
      if (forced) {
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error) {
          toast.error(error.message);
          return;
        }
      }

      if (needsCompletion) {
        await completeProfile({
          data: {
            ...(needsEmail ? { email } : {}),
            ...(needsCnpj ? { cnpj } : {}),
          },
        });
      }

      if (user && forced) {
        await supabase
          .from("profiles")
          .update({ must_reset_password: false })
          .eq("id", user.id);
      }

      await refresh();
      toast.success("Cadastro atualizado");
      nav({ to: forced ? "/" : "/login" });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return null;
  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: "var(--brand-bg)" }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        <h1 className="font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>
          {forced ? "Defina sua nova senha" : needsCompletion ? "Complete seu cadastro" : "Definir nova senha"}
        </h1>
        {forced && (
          <p className="mt-2 text-sm text-muted-foreground">
            Este é seu primeiro acesso. Por segurança, crie uma senha pessoal antes de continuar.
          </p>
        )}
        {needsCompletion && (
          <p className="mt-2 text-sm text-muted-foreground">
            Precisamos completar seus dados para você poder entrar tanto por email quanto por CNPJ.
          </p>
        )}

        {forced && (
          <>
            <input
              type="password"
              required
              minLength={6}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Nova senha"
              className="mt-4 w-full rounded-lg border border-border bg-card px-3 py-2.5"
            />
            <input
              type="password"
              required
              minLength={6}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Confirmar senha"
              className="mt-3 w-full rounded-lg border border-border bg-card px-3 py-2.5"
            />
          </>
        )}

        {needsEmail && (
          <div className="mt-3">
            <label className="text-sm font-medium">Seu email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5"
            />
          </div>
        )}
        {needsCnpj && (
          <div className="mt-3">
            <label className="text-sm font-medium">Seu CNPJ</label>
            <input
              type="text"
              required
              inputMode="numeric"
              value={cnpj}
              onChange={(e) => setCnpj(maskCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5"
            />
          </div>
        )}

        <button
          disabled={saving}
          className="mt-4 w-full rounded-lg py-2.5 font-medium text-white disabled:opacity-60"
          style={{ background: "var(--brand-primary)" }}
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </div>
  );
}
