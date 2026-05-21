import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Upload, Mail, KeyRound } from "lucide-react";
import { changeLoginEmail } from "@/lib/change-login-email.functions";

export const Route = createFileRoute("/_app/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const { user, profile, refresh } = useAuth();
  const trocarEmailLogin = useServerFn(changeLoginEmail);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cargo, setCargo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNome(profile?.nome ?? "");
    setEmail(profile?.email ?? "");
    setCnpj((profile as any)?.cnpj ?? "");
    setTelefone(profile?.telefone ?? "");
    setCargo(profile?.cargo ?? "");
  }, [profile]);

  const salvar = async () => {
    if (!user) return;
    setSaving(true);

    const novoEmail = email.trim().toLowerCase();
    const emailAtualAuth = (user.email ?? "").toLowerCase();
    const emailMudou =
      !!novoEmail &&
      novoEmail !== emailAtualAuth &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novoEmail);

    // Se o email mudou, sincroniza também o email de login (auth.users)
    // para que o acesso automático (SSO) aos sistemas integrados funcione
    // tanto por email quanto por CNPJ.
    if (emailMudou) {
      try {
        await trocarEmailLogin({ data: { newEmail: novoEmail } });
      } catch (e: any) {
        setSaving(false);
        return toast.error(e?.message ?? "Não foi possível atualizar o email de acesso.");
      }
    }

    const patch = { nome, email: novoEmail || email, cnpj, telefone, cargo };
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }

    // Sincroniza com a tabela Clientes (por email ou CNPJ)
    const filters: string[] = [];
    const origEmail = profile?.email?.trim();
    const origCnpj = (profile as any)?.cnpj?.trim();
    if (origEmail) filters.push(`email.eq.${origEmail}`);
    if (origCnpj) filters.push(`cnpj.eq.${origCnpj}`);
    if (email?.trim()) filters.push(`email.eq.${email.trim()}`);
    if (cnpj?.trim()) filters.push(`cnpj.eq.${cnpj.trim()}`);
    if (filters.length > 0) {
      await supabase.from("clientes").update({ nome, email, cnpj, telefone, cargo }).or(filters.join(","));
    }

    setSaving(false);
    toast.success(
      emailMudou
        ? "Perfil atualizado. Use o novo email no próximo login."
        : "Perfil atualizado",
    );
    refresh();
  };

  const upload = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    refresh();
    toast.success("Avatar atualizado");
  };

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-10">
      <h1 className="font-titulo text-4xl" style={{ color: "var(--brand-navy)" }}>Meu perfil</h1>

      <div className="mt-8 flex items-center gap-5">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-muted">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl font-titulo" style={{ color: "var(--brand-primary)" }}>
              {(nome || profile?.email || "U")[0].toUpperCase()}
            </div>
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent">
          <Upload className="h-4 w-4" /> Trocar foto
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </label>
      </div>

      <div className="mt-8 space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <Field label="Nome" value={nome} onChange={setNome} />
        <Field label="Email" value={email} onChange={setEmail} />
        <Field label="CNPJ" value={cnpj} onChange={setCnpj} />
        <Field label="Telefone" value={telefone} onChange={setTelefone} />
        <Field label="Cargo" value={cargo} onChange={setCargo} />
        <button
          onClick={salvar}
          disabled={saving}
          className="rounded-lg px-5 py-2.5 font-medium text-white disabled:opacity-60"
          style={{ background: "var(--brand-primary)" }}
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>

      <TrocarEmailLogin />
    </div>
  );
}

function TrocarEmailLogin() {
  const { user, refresh } = useAuth();
  const trocar = useServerFn(changeLoginEmail);
  const [novoEmail, setNovoEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const emailAtual = user?.email ?? "";
  const isGenerico = emailAtual.endsWith("@distribuilucros.local");

  if (!isGenerico) return null;

  const submit = async () => {
    const v = novoEmail.trim().toLowerCase();
    if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return toast.error("Informe um email válido.");
    }
    setSaving(true);
    try {
      await trocar({ data: { newEmail: v } });
      toast.success("Email de acesso atualizado. Use o novo email no próximo login.");
      setNovoEmail("");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao atualizar email.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-5 w-5" style={{ color: "var(--brand-primary)" }} />
        <div className="flex-1">
          <h2 className="font-titulo text-xl" style={{ color: "var(--brand-navy)" }}>
            Trocar email de acesso
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Você está usando um email gerado automaticamente
            (<span className="font-mono">{emailAtual}</span>). Cadastre o email que você usa no dia a dia para fazer login por ele.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="seu.email@empresa.com"
              className="flex-1 rounded-lg border border-border bg-card px-3 py-2.5 outline-none focus:ring-2"
              style={{ ["--tw-ring-color" as any]: "var(--brand-primary)" }}
            />
            <button
              onClick={submit}
              disabled={saving}
              className="rounded-lg px-5 py-2.5 font-medium text-white disabled:opacity-60"
              style={{ background: "var(--brand-primary)" }}
            >
              {saving ? "Atualizando…" : "Atualizar email"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            O acesso automático pelo CNPJ continua funcionando normalmente.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 outline-none focus:ring-2 disabled:opacity-60"
        style={{ ["--tw-ring-color" as any]: "var(--brand-primary)" }}
      />
    </div>
  );
}
