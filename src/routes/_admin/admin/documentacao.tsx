import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Upload, Trash2, FileText, Download, X, Search, ArrowLeft } from "lucide-react";
import { formatNome } from "@/lib/format-nome";

export const Route = createFileRoute("/_admin/admin/documentacao")({
  component: DocumentacaoAdmin,
});

type Profile = {
  id: string;
  nome: string | null;
  email: string | null;
  empresa_id: string | null;
};

type Empresa = { id: string; nome: string };

type Documento = {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  arquivo_url: string;
  arquivo_path: string;
  tamanho_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

function fmtBytes(b?: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentacaoAdmin() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: e }] = await Promise.all([
        supabase.from("profiles").select("id,nome,email,empresa_id").order("nome"),
        supabase.from("empresas").select("id,nome"),
      ]);
      setProfiles((p as Profile[]) ?? []);
      setEmpresas((e as Empresa[]) ?? []);
    })();
  }, []);

  const empresaNome = (id: string | null) =>
    id ? empresas.find((x) => x.id === id)?.nome ?? "—" : "—";

  const filtered = useMemo(
    () =>
      profiles.filter((p) =>
        !q
          ? true
          : [p.nome, p.email, empresaNome(p.empresa_id)]
              .some((v) => String(v ?? "").toLowerCase().includes(q.toLowerCase())),
      ),
    [profiles, q, empresas],
  );

  if (selected) {
    return (
      <ClienteDocumentos
        cliente={selected}
        empresaNome={empresaNome(selected.empresa_id)}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>
            Documentação
          </h2>
          <p className="text-sm text-muted-foreground">
            Selecione um cliente para gerenciar os documentos dele. Cada cliente vê apenas
            os próprios documentos — sem permissão para adicionar, editar ou remover.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Buscar cliente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-64 rounded-lg border border-border bg-card py-2 pl-8 pr-3 text-sm outline-none focus:ring-2"
            style={{ ["--tw-ring-color" as any]: "var(--brand-primary)" }}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium w-32"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{p.nome ? formatNome(p.nome) : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.email ?? "—"}</td>
                <td className="px-4 py-3">{empresaNome(p.empresa_id)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelected(p)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    Abrir documentos
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClienteDocumentos({
  cliente,
  empresaNome,
  onBack,
}: {
  cliente: Profile;
  empresaNome: string;
  onBack: () => void;
}) {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Replica a lógica do /documentacao do cliente: documentos vinculados
    // ao user_id OU a um cliente que casa por CNPJ/email do perfil
    const { data: prof } = await supabase
      .from("profiles")
      .select("cnpj, email")
      .eq("id", cliente.id)
      .maybeSingle();
    const cnpjDigits = String(prof?.cnpj ?? "").replace(/\D/g, "");
    const email = String(prof?.email ?? "").trim().toLowerCase();

    const clienteIds: string[] = [];
    if (cnpjDigits || email) {
      const filtros: string[] = [];
      if (cnpjDigits) filtros.push(`cnpj.eq.${cnpjDigits}`);
      if (email) filtros.push(`email.ilike.${email}`);
      const { data: clis } = await supabase
        .from("clientes")
        .select("id")
        .or(filtros.join(","));
      for (const c of clis ?? []) clienteIds.push((c as any).id);
    }

    const orParts = [`user_id.eq.${cliente.id}`];
    if (clienteIds.length) orParts.push(`cliente_id.in.(${clienteIds.join(",")})`);

    const { data, error } = await supabase
      .from("documentos")
      .select("*")
      .or(orParts.join(","))
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDocs((data as Documento[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [cliente.id]);

  const baixar = async (d: Documento) => {
    const { data, error } = await supabase.storage
      .from("documentos-clientes")
      .createSignedUrl(d.arquivo_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const remover = async (d: Documento) => {
    if (!confirm(`Remover "${d.nome}"?`)) return;
    const [{ error: delDb }, { error: delFile }] = await Promise.all([
      supabase.from("documentos").delete().eq("id", d.id),
      supabase.storage.from("documentos-clientes").remove([d.arquivo_path]),
    ]);
    if (delDb) return toast.error(delDb.message);
    if (delFile) console.warn(delFile);
    toast.success("Documento removido");
    load();
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à lista de clientes
      </button>

      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>
            Documentos · {cliente.nome ? formatNome(cliente.nome) : cliente.email ?? "Cliente"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {cliente.email ?? "—"} · {empresaNome} · {docs.length}{" "}
            {docs.length === 1 ? "documento" : "documentos"}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white"
          style={{ background: "var(--brand-primary)" }}
        >
          <Plus className="h-4 w-4" /> Adicionar documento
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium">Tamanho</th>
              <th className="px-4 py-3 font-medium">Enviado em</th>
              <th className="px-4 py-3 font-medium w-32"></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{d.nome}</div>
                      {d.descricao && (
                        <div className="text-xs text-muted-foreground">{d.descricao}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{fmtBytes(d.tamanho_bytes)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => baixar(d)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Baixar"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remover(d)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && docs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum documento ainda. Clique em "Adicionar documento".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <NovoDocumentoDialog
          userId={cliente.id}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function NovoDocumentoDialog({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Selecione um arquivo");
    if (!nome.trim()) return toast.error("Informe o nome do documento");

    setSaving(true);
    try {
      setProgress("Enviando arquivo…");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("documentos-clientes")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from("documentos-clientes")
        .getPublicUrl(path);

      setProgress("Salvando…");
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("documentos").insert({
        user_id: userId,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        arquivo_path: path,
        arquivo_url: urlData.publicUrl,
        tamanho_bytes: file.size,
        mime_type: file.type || null,
        created_by: user?.id ?? null,
      });
      if (insErr) throw insErr;

      toast.success("Documento adicionado");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar");
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-titulo text-xl" style={{ color: "var(--brand-navy)" }}>
            Novo documento
          </h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Nome *</span>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Contrato social 2025"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Descrição</span>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Observações sobre este documento…"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
            />
          </label>

          <div className="rounded-xl border border-dashed border-border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" /> Arquivo *
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-6 text-sm hover:bg-muted">
              <Upload className="h-4 w-4" />
              {file ? file.name : "Clique para selecionar o arquivo"}
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {file && (
              <div className="mt-2 text-xs text-muted-foreground">
                {fmtBytes(file.size)} · {file.type || "tipo desconhecido"}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{progress}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: "var(--brand-primary)" }}
            >
              {saving ? "Enviando…" : "Adicionar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
