import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createClienteUser } from "@/lib/admin-users.functions";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/clientes")({
  component: ClientesPage,
});

type Profile = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  cnpj: string | null;
  empresa_id: string | null;
};
type Empresa = { id: string; nome: string };
type ClienteImportado = {
  id: string;
  nome: string;
  cnpj: string | null;
  empresa_id: string | null;
};


function formatCnpj(v: string | null) {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  if (d.length !== 14) return v;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function ClientesPage() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [clientes, setClientes] = useState<ClienteImportado[]>([]);
  const [q, setQ] = useState("");
  const [qImp, setQImp] = useState("");
  const [open, setOpen] = useState(false);


  const load = () =>
    supabase
      .from("profiles")
      .select("id,nome,email,telefone,cargo,cnpj,empresa_id")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => setRows((data as Profile[]) ?? []));


  useEffect(() => {
    load();
    supabase
      .from("empresas")
      .select("id,nome")
      .order("nome")
      .then(({ data }) => setEmpresas((data as Empresa[]) ?? []));
    supabase
      .from("clientes")
      .select("id,nome,cnpj,empresa_id")
      .order("nome")
      .limit(5000)
      .then(({ data }) => setClientes((data as ClienteImportado[]) ?? []));
  }, []);


  const filtered = rows.filter((r) =>
    !q
      ? true
      : [r.nome, r.email, r.telefone, r.cargo, r.cnpj].some((v) =>
          String(v ?? "").toLowerCase().includes(q.toLowerCase()),
        ),
  );

  const filteredImp = clientes.filter((c) =>
    !qImp
      ? true
      : [c.nome, c.cnpj].some((v) =>
          String(v ?? "").toLowerCase().includes(qImp.toLowerCase()),
        ),
  );

  const empresaNome = (id: string | null) =>
    id ? empresas.find((e) => e.id === id)?.nome ?? "—" : "—";


  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>
          Clientes
        </h2>
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

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">CNPJ</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Cargo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">{r.nome ?? "—"}</td>
                <td className="px-4 py-3">{r.email ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatCnpj(r.cnpj)}</td>
                <td className="px-4 py-3">{empresaNome(r.empresa_id)}</td>
                <td className="px-4 py-3">{r.telefone ?? "—"}</td>
                <td className="px-4 py-3">{r.cargo ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum registro.
                </td>
              </tr>
            )}

          </tbody>
        </table>
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
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
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
