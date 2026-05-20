import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const { user, profile, refresh } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const forced = !!profile?.must_reset_password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");
    if (pw !== pw2) return toast.error("As senhas não coincidem");
    if (pw === "2m_Brand")
      return toast.error("Escolha uma senha diferente da senha inicial");

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }

    if (user) {
      await supabase
        .from("profiles")
        .update({ must_reset_password: false })
        .eq("id", user.id);
      await refresh();
    }
    setSaving(false);
    toast.success("Senha atualizada");
    nav({ to: forced ? "/" : "/login" });
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
          {forced ? "Defina sua nova senha" : "Definir nova senha"}
        </h1>
        {forced && (
          <p className="mt-2 text-sm text-muted-foreground">
            Este é seu primeiro acesso. Por segurança, crie uma senha pessoal antes de continuar.
          </p>
        )}
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
        <button
          disabled={saving}
          className="mt-4 w-full rounded-lg py-2.5 font-medium text-white disabled:opacity-60"
          style={{ background: "var(--brand-primary)" }}
        >
          {saving ? "Salvando…" : "Atualizar"}
        </button>
      </form>
    </div>
  );
}
