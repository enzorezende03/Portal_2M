import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createClienteUser } from "@/lib/admin-users.functions";
import { toast } from "sonner";
import { Plus, X, Pencil, Eye } from "lucide-react";
import { startImpersonation } from "@/lib/impersonation";
import { maskCnpj, maskTelefone } from "@/lib/masks";


export const Route = createFileRoute("/_admin/admin/clientes")({
  component: ClientesPage,
});

type Source = "profile" | "cliente";
type Row = {
  source: Source;
  id: string;
  nome: string | null;
  email: string | null;
  cnpj: string | null;
  empresa_id: string | null;
  telefone: string | null;
  cargo: string | null;
};
type Empresa = { id: string; nome: string };

function formatCnpj(v: string | null) {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  if (d.length !== 14) return v;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function ClientesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = async () => {
    const [p, c] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,nome,email,cnpj,empresa_id,telefone,cargo,created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("clientes")
        .select("id,nome,email,cnpj,empresa_id,telefone,cargo")
        .order("nome")
        .limit(5000),
    ]);
    const profileRows: Row[] = ((p.data as any[]) ?? []).map((r) => ({
      source: "profile",
      id: r.id,
      nome: r.nome,
      email: r.email,
      cnpj: r.cnpj,
      empresa_id: r.empresa_id,
      telefone: r.telefone,
      cargo: r.cargo,
    }));
    const clienteRows: Row[] = ((c.data as any[]) ?? []).map((r) => ({
      source: "cliente",
      id: r.id,
      nome: r.nome,
      email: r.email,
      cnpj: r.cnpj,
      empresa_id: r.empresa_id,
      telefone: r.telefone,
      cargo: r.cargo,
    }));
    setRows([...profileRows, ...clienteRows]);
  };

  useEffect(() => {
    load();
    supabase
      .from("empresas")
      .select("id,nome")
      .order("nome")
      .then(({ data }) => setEmpresas((data as Empresa[]) ?? []));
  }, []);

  const filtered = rows.filter((r) =>
    !q
      ? true
      : [r.nome, r.email, r.cnpj, r.telefone, r.cargo].some((v) =>
          String(v ?? "").toLowerCase().includes(q.toLowerCase()),
        ),
  );

  const empresaNome = (id: string | null) =>
    id ? empresas.find((e) => e.id === id)?.nome ?? "—" : "—";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>
            Clientes
          </h2>
          <p className="text-sm text-muted-foreground">{filtered.length} de {rows.length} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2"
            style={{ ["--tw-ring-color" as any]: "var(--brand-primary)" }}
          />
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white"
            style={{ background: "var(--brand-primary)" }}
          >
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto surface">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">CNPJ</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Cargo</th>
              <th className="px-4 py-3 font-medium w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 1000).map((r) => (
              <tr key={`${r.source}-${r.id}`} className="border-t border-border">
                <td className="px-4 py-3">{r.nome ?? "—"}</td>
                <td className="px-4 py-3">{r.email ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatCnpj(r.cnpj)}</td>
                <td className="px-4 py-3">{empresaNome(r.empresa_id)}</td>
                <td className="px-4 py-3">{r.telefone ?? "—"}</td>
                <td className="px-4 py-3">{r.cargo ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {r.source === "profile" && (
                      <button
                        onClick={async () => {
                          try {
                            await startImpersonation(r.id, r.nome);
                          } catch (e: any) {
                            toast.error(e?.message ?? "Não foi possível entrar como este usuário.");
                          }
                        }}
                        className="inline-flex items-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Ver como este usuário"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(r)}
                      className="inline-flex items-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum registro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {filtered.length > 1000 && (
          <div className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            Exibindo 1000 de {filtered.length}. Refine a busca para ver mais.
          </div>
        )}
      </div>

      {open && (
        <NovoClienteDialog
          empresas={empresas}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            load();
          }}
        />
      )}

      {editing && (
        <EditarClienteDialog
          row={editing}
          empresas={empresas}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditarClienteDialog({
  row,
  empresas,
  onClose,
  onSaved,
}: {
  row: Row;
  empresas: Empresa[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(row.nome ?? "");
  const [email, setEmail] = useState(row.email ?? "");
  const [cnpj, setCnpj] = useState(row.cnpj ?? "");
  const [empresaId, setEmpresaId] = useState(row.empresa_id ?? "");
  const [telefone, setTelefone] = useState(row.telefone ?? "");
  const [cargo, setCargo] = useState(row.cargo ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim() || null,
        email: email.trim() || null,
        cnpj: cnpj.replace(/\D/g, "") || null,
        empresa_id: empresaId || null,
        telefone: telefone.trim() || null,
        cargo: cargo.trim() || null,
      };
      const { error } = await supabase
        .from(row.source === "profile" ? "profiles" : "clientes")
        .update(payload)
        .eq("id", row.id);
      if (error) throw error;
      toast.success("Cliente atualizado");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
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
        className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-titulo text-xl" style={{ color: "var(--brand-navy)" }}>
            Editar cliente
          </h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Nome">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2" />
          </Field>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2" />
          </Field>
          <Field label="CNPJ">
            <input value={cnpj} onChange={(e) => setCnpj(maskCnpj(e.target.value))} placeholder="00.000.000/0000-00" inputMode="numeric" className="w-full rounded-lg border border-border bg-card px-3 py-2" />
          </Field>
          <Field label="Empresa">
            <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2">
              <option value="">— Nenhuma —</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Telefone">
            <input value={telefone} onChange={(e) => setTelefone(maskTelefone(e.target.value))} placeholder="(00) 00000-0000" inputMode="numeric" className="w-full rounded-lg border border-border bg-card px-3 py-2" />
          </Field>

          <Field label="Cargo">
            <input value={cargo} onChange={(e) => setCargo(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2" />
          </Field>
          {row.source === "cliente" && !row.email && (
            <p className="text-xs text-muted-foreground">
              Este cliente foi importado e ainda não tem login. Adicionar email aqui só salva o dado — não cria acesso.
            </p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ background: "var(--brand-primary)" }}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}



function NovoClienteDialog({
  empresas,
  onClose,
  onCreated,
}: {
  empresas: Empresa[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const create = useServerFn(createClienteUser);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await create({
        data: {
          nome,
          email,
          cnpj: cnpj.replace(/\D/g, "") || null,
          empresa_id: empresaId || null,
        },
      });
      toast.success("Usuário criado. Senha inicial: 2m_Brand");
      onCreated();

    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar usuário");
    } finally {
      setSaving(false);
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
        className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-titulo text-xl" style={{ color: "var(--brand-navy)" }}>
            Novo cliente
          </h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Nome">
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2"
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2"
            />
          </Field>
          <Field label="CNPJ">
            <input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              className="w-full rounded-lg border border-border bg-card px-3 py-2"
            />
          </Field>

          <Field label="Senha inicial (fixa, o usuário troca no 1º acesso)">
            <input
              value="2m_Brand"
              readOnly
              disabled
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-muted-foreground"
            />
          </Field>

          <Field label="Empresa (opcional)">
            <select
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2"
            >
              <option value="">— Nenhuma —</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: "var(--brand-primary)" }}
          >
            {saving ? "Criando…" : "Criar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

// Mantido para reutilização em outras telas admin
export function SimpleList({ table, titulo, cols }: { table: string; titulo: string; cols: string[] }) {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    supabase.from(table as any).select("*").limit(200).then(({ data }) => setRows(data ?? []));
  }, [table]);
  const filtered = rows.filter((r) =>
    !q ? true : Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>{titulo}</h2>
        <input
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2"
          style={{ ["--tw-ring-color" as any]: "var(--brand-primary)" }}
        />
      </div>
      <div className="overflow-x-auto surface">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>{cols.map((c) => <th key={c} className="px-4 py-3 font-medium capitalize">{c}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                {cols.map((c) => <td key={c} className="px-4 py-3">{String(r[c] ?? "—")}</td>)}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={cols.length} className="px-4 py-10 text-center text-muted-foreground">Nenhum registro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
