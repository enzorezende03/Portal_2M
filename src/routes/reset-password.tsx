import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    else setReady(true);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada");
    nav({ to: "/login" });
  };

  if (!ready) return null;
  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: "var(--brand-bg)" }}>
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>Definir nova senha</h1>
        <input
          type="password"
          required
          minLength={6}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Nova senha"
          className="mt-4 w-full rounded-lg border border-border bg-card px-3 py-2.5"
        />
        <button className="mt-4 w-full rounded-lg py-2.5 font-medium text-white" style={{ background: "var(--brand-primary)" }}>
          Atualizar
        </button>
      </form>
    </div>
  );
}
