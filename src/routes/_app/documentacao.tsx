import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  FileText,
  Download,
  FolderOpen,
  AlertTriangle,
  Shield,
  Search,
  X,
  Trash2,
  Pencil,
  Plus,
  Upload,
  ArrowLeft,

} from "lucide-react";
import { formatNome } from "@/lib/format-nome";

export const Route = createFileRoute("/_app/documentacao")({
  component: DocumentacaoCliente,
});

type Documento = {
  id: string;
  nome: string;
  descricao: string | null;
  arquivo_path: string;
  arquivo_url?: string | null;
  tamanho_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  nome: string | null;
  email: string | null;
  cnpj: string | null;
};

function fmtBytes(b?: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentacaoCliente() {
  const { user, isAdmin, isColaborador } = useAuth();
  const canManage = isAdmin || isColaborador;

  // Cliente sendo "impersonado" pelo admin/colaborador. Null = ver os próprios documentos.
  const [viewAs, setViewAs] = useState<Profile | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [cnpjFaltando, setCnpjFaltando] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const targetUserId = viewAs?.id ?? user?.id ?? null;

  const load = async () => {
    if (!targetUserId) return;
    setLoading(true);
    const { data: prof } = await supabase
      .from("profiles")
      .select("cnpj, email")
      .eq("id", targetUserId)
      .maybeSingle();
    const cnpjDigits = String(prof?.cnpj ?? "").replace(/\D/g, "");
    const email = String(prof?.email ?? "").trim().toLowerCase();
    setCnpjFaltando(!cnpjDigits && !viewAs);

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

    const orParts = [`user_id.eq.${targetUserId}`];
    if (clienteIds.length) orParts.push(`cliente_id.in.(${clienteIds.join(",")})`);

    const { data, error } = await supabase
      .from("documentos")
      .select("id,nome,descricao,arquivo_path,arquivo_url,tamanho_bytes,mime_type,created_at")
      .or(orParts.join(","))
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDocs((data as Documento[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  const baixar = async (d: Documento) => {
    const { data, error } = await supabase.storage
      .from("documentos-clientes")
      .createSignedUrl(d.arquivo_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const remover = async (d: Documento) => {
    if (!canManage) return;
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

  const impersonating = canManage && viewAs;
  const headerNome = impersonating
    ? viewAs?.nome
      ? formatNome(viewAs.nome)
      : viewAs?.email ?? "Cliente"
    : null;

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: impersonating ? "var(--brand-navy)" : "var(--brand-primary)" }}
        />
        {impersonating ? "Vendo como cliente" : "Área pessoal"}
      </div>
      <h1 className="font-titulo text-4xl" style={{ color: "var(--brand-navy)" }}>
        {impersonating ? `Documentos · ${headerNome}` : "Documentação"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {impersonating
          ? `${viewAs?.email ?? "—"} · ${docs.length} ${docs.length === 1 ? "documento" : "documentos"}`
          : "Documentos enviados pela nossa equipe para você. Apenas você e a equipe têm acesso."}
      </p>

      {canManage && !impersonating && (
        <div
          className="mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm"
          style={{
            borderColor: "var(--brand-navy)",
            background: "color-mix(in oklab, var(--brand-navy) 8%, transparent)",
            color: "var(--brand-navy)",
          }}
        >
          <Shield className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">
              Você está logado como {isAdmin ? "administrador" : "colaborador"}
            </div>
            <p className="mt-0.5 opacity-80">
              Você pode visualizar a tela de documentação como qualquer cliente vê — e ainda
              tem permissão para adicionar ou remover documentos.
            </p>
            <button
              onClick={() => setPickerOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
              style={{ background: "var(--brand-navy)" }}
            >
              <Search className="h-3.5 w-3.5" /> Ver documentos de um cliente
            </button>
          </div>
        </div>
      )}

      {impersonating && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
          <button
            onClick={() => setViewAs(null)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar aos meus documentos
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <Search className="h-3.5 w-3.5" /> Trocar de cliente
            </button>
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
              style={{ background: "var(--brand-primary)" }}
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar documento
            </button>
          </div>
        </div>
      )}

      {cnpjFaltando && !impersonating && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">Seu CNPJ ainda não está cadastrado</div>
            <p className="mt-0.5 text-amber-800">
              As guias importadas do G-Click são vinculadas pelo CNPJ. Preencha seu CNPJ no
              perfil para que os documentos da sua empresa apareçam aqui automaticamente.
            </p>
            <Link
              to="/perfil"
              className="mt-2 inline-flex items-center rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
            >
              Preencher CNPJ no perfil
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            Carregando…
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            <FolderOpen className="mx-auto mb-2 h-10 w-10 opacity-40" />
            Nenhum documento disponível por enquanto.
          </div>
        ) : (
          docs.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "var(--brand-soft)", color: "var(--brand-navy)" }}
                >
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.nome}</div>
                  {d.descricao && (
                    <div className="line-clamp-2 text-xs text-muted-foreground">{d.descricao}</div>
                  )}
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {fmtBytes(d.tamanho_bytes)} ·{" "}
                    {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => baixar(d)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white"
                  style={{ background: "var(--brand-primary)" }}
                >
                  <Download className="h-4 w-4" /> Baixar
                </button>
                {canManage && impersonating && (
                  <button
                    onClick={() => remover(d)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {pickerOpen && canManage && (
        <ClientePickerDialog
          onClose={() => setPickerOpen(false)}
          onSelect={(p) => {
            setViewAs(p);
            setPickerOpen(false);
          }}
        />
      )}

      {uploadOpen && canManage && impersonating && viewAs && (
        <NovoDocumentoDialog
          userId={viewAs.id}
          onClose={() => setUploadOpen(false)}
          onSaved={() => {
            setUploadOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ClientePickerDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (p: Profile) => void;
}) {
  const [profiles, setProfiles] = useState<Array<Profile & { docCount: number }>>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlyWithDocs, setOnlyWithDocs] = useState(true);

  useEffect(() => {
    (async () => {
      const PAGE = 1000;
      const fetchAll = async <T,>(table: string, cols: string): Promise<T[]> => {
        const out: T[] = [];
        let from = 0;
        for (let i = 0; i < 20; i++) {
          const { data, error } = await supabase
            .from(table as any)
            .select(cols)
            .range(from, from + PAGE - 1);
          if (error) {
            toast.error(error.message);
            break;
          }
          const rows = (data as T[]) ?? [];
          out.push(...rows);
          if (rows.length < PAGE) break;
          from += PAGE;
        }
        return out;
      };

      const [profs, clientes, docs] = await Promise.all([
        fetchAll<Profile>("profiles", "id,nome,email,cnpj"),
        fetchAll<{ id: string; cnpj: string | null; email: string | null }>(
          "clientes",
          "id,cnpj,email",
        ),
        fetchAll<{ user_id: string | null; cliente_id: string | null }>(
          "documentos",
          "user_id,cliente_id",
        ),
      ]);

      const docsByUser = new Map<string, number>();
      const docsByCliente = new Map<string, number>();
      for (const d of docs) {
        if (d.user_id) docsByUser.set(d.user_id, (docsByUser.get(d.user_id) ?? 0) + 1);
        if (d.cliente_id)
          docsByCliente.set(d.cliente_id, (docsByCliente.get(d.cliente_id) ?? 0) + 1);
      }

      const clientesByCnpj = new Map<string, string[]>();
      const clientesByEmail = new Map<string, string[]>();
      for (const c of clientes) {
        const cnpj = String(c.cnpj ?? "").replace(/\D/g, "");
        const email = String(c.email ?? "").trim().toLowerCase();
        if (cnpj) {
          const arr = clientesByCnpj.get(cnpj) ?? [];
          arr.push(c.id);
          clientesByCnpj.set(cnpj, arr);
        }
        if (email) {
          const arr = clientesByEmail.get(email) ?? [];
          arr.push(c.id);
          clientesByEmail.set(email, arr);
        }
      }

      const enriched = profs.map((p) => {
        const cnpj = String(p.cnpj ?? "").replace(/\D/g, "");
        const email = String(p.email ?? "").trim().toLowerCase();
        const cids = new Set<string>();
        if (cnpj) for (const id of clientesByCnpj.get(cnpj) ?? []) cids.add(id);
        if (email) for (const id of clientesByEmail.get(email) ?? []) cids.add(id);
        let count = docsByUser.get(p.id) ?? 0;
        for (const cid of cids) count += docsByCliente.get(cid) ?? 0;
        return { ...p, docCount: count };
      });

      enriched.sort((a, b) => {
        if (b.docCount !== a.docCount) return b.docCount - a.docCount;
        return (a.nome ?? "").localeCompare(b.nome ?? "");
      });

      setProfiles(enriched);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = profiles;
    if (onlyWithDocs) list = list.filter((p) => p.docCount > 0);
    if (term) {
      list = list.filter((p) =>
        [p.nome, p.email, p.cnpj]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term)),
      );
    }
    return list.slice(0, 200);
  }, [profiles, q, onlyWithDocs]);

  const totalComDocs = useMemo(
    () => profiles.filter((p) => p.docCount > 0).length,
    [profiles],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h3 className="font-titulo text-xl" style={{ color: "var(--brand-navy)" }}>
              Selecionar cliente
            </h3>
            {!loading && (
              <p className="text-xs text-muted-foreground">
                {totalComDocs} de {profiles.length} clientes possuem documentos cadastrados
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2 border-b border-border p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              placeholder="Buscar por nome, email ou CNPJ…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-3 text-sm outline-none focus:ring-2"
              style={{ ["--tw-ring-color" as any]: "var(--brand-primary)" }}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={onlyWithDocs}
              onChange={(e) => setOnlyWithDocs(e.target.checked)}
            />
            Mostrar apenas clientes com documentos
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => onSelect(p)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {p.nome ? formatNome(p.nome) : "—"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.email ?? "—"}
                        {p.cnpj ? ` · ${p.cnpj}` : ""}
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor:
                          p.docCount > 0
                            ? "color-mix(in oklab, var(--brand-primary) 15%, transparent)"
                            : "color-mix(in oklab, var(--muted-foreground) 12%, transparent)",
                        color:
                          p.docCount > 0
                            ? "var(--brand-primary)"
                            : "var(--muted-foreground)",
                      }}
                      title={
                        p.docCount > 0
                          ? `${p.docCount} documento(s) cadastrado(s)`
                          : "Nenhum documento cadastrado"
                      }
                    >
                      {p.docCount} {p.docCount === 1 ? "doc" : "docs"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!loading && profiles.length > filtered.length && (
          <div className="border-t border-border p-2 text-center text-xs text-muted-foreground">
            Mostrando {filtered.length} de{" "}
            {onlyWithDocs ? totalComDocs : profiles.length} — refine a busca para ver mais.
          </div>
        )}
      </div>
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
