import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { bulkCreateClientes } from "@/lib/admin-users.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/import-clientes")({
  component: ImportClientesPage,
});

type Row = { email: string; nome: string; source: string };
type Result = { email: string; status: "created" | "exists" | "error"; message?: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function detectSep(line: string): string {
  const c = (s: string) => (line.match(new RegExp(s, "g")) || []).length;
  return c(";") >= c(",") ? ";" : ",";
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.length);
  if (!lines.length) return [];
  const sep = detectSep(lines[0]);
  const parseLine = (l: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (ch === '"') {
        if (q && l[i + 1] === '"') { cur += '"'; i++; }
        else q = !q;
      } else if (ch === sep && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((l) => {
    const cells = parseLine(l);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

const EMAIL_KEYS = ["email", "email_responsavel", "e-mail", "mail"];
const NAME_KEYS = ["nome", "full_name", "razao_social", "company_name", "name"];

function extract(rows: Record<string, string>[], source: string): Row[] {
  const out: Row[] = [];
  for (const r of rows) {
    let email = "";
    for (const k of EMAIL_KEYS) if (r[k]) { email = r[k]; break; }
    email = email.toLowerCase().trim();
    if (!EMAIL_RE.test(email)) continue;
    let nome = "";
    for (const k of NAME_KEYS) if (r[k]) { nome = r[k]; break; }
    if (!nome) nome = email.split("@")[0];
    out.push({ email, nome: nome.trim(), source });
  }
  return out;
}

function ImportClientesPage() {
  const bulk = useServerFn(bulkCreateClientes);
  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const all: Row[] = [];
    for (const f of Array.from(files)) {
      const text = await f.text();
      all.push(...extract(parseCSV(text), f.name));
    }
    // dedup por email, primeira ocorrência ganha
    const map = new Map<string, Row>();
    for (const r of all) if (!map.has(r.email)) map.set(r.email, r);
    setRows([...map.values()]);
    setResults([]);
    toast.success(`${map.size} emails únicos válidos prontos para importar`);
  };

  const run = async () => {
    if (!rows.length) return;
    setRunning(true);
    setResults([]);
    setProgress({ done: 0, total: rows.length });
    const all: Result[] = [];
    const BATCH = 50;
    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH).map((r) => ({ email: r.email, nome: r.nome }));
        const { results: r } = await bulk({ data: { items: slice } });
        all.push(...r);
        setResults([...all]);
        setProgress({ done: Math.min(i + BATCH, rows.length), total: rows.length });
      }
      const c = all.filter((r) => r.status === "created").length;
      const e = all.filter((r) => r.status === "exists").length;
      const x = all.filter((r) => r.status === "error").length;
      toast.success(`Criados: ${c} · Já existiam: ${e} · Erros: ${x}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha na importação");
    } finally {
      setRunning(false);
    }
  };

  const bySrc = rows.reduce<Record<string, number>>((a, r) => {
    a[r.source] = (a[r.source] || 0) + 1;
    return a;
  }, {});

  return (
    <div>
      <h2 className="mb-4 font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>
        Importar Clientes (CSV)
      </h2>

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="font-titulo text-lg" style={{ color: "var(--brand-navy)" }}>
          Como funciona
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• Envie um ou mais arquivos CSV com os clientes.</li>
          <li>
            • Identificamos automaticamente as colunas de <strong>e-mail</strong> e{" "}
            <strong>nome</strong> (aceita variações como <em>email_responsavel</em>,{" "}
            <em>razao_social</em> e <em>company_name</em>).
          </li>
          <li>• E-mails duplicados são ignorados automaticamente.</li>
          <li>
            • Cada cliente é criado com a senha padrão <strong>2m_Brand</strong> e
            precisa redefini-la no primeiro acesso.
          </li>
        </ul>
        <input
          type="file"
          accept=".csv,text/csv"
          multiple
          onChange={(e) => onFiles(e.target.files)}
          className="mt-4 block text-sm"
        />
      </div>

      {rows.length > 0 && (
        <div className="mt-5 rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <strong>{rows.length}</strong> emails únicos prontos —{" "}
              {Object.entries(bySrc).map(([s, n]) => (
                <span key={s} className="mr-3 text-muted-foreground">
                  {s}: {n}
                </span>
              ))}
            </div>
            <button
              onClick={run}
              disabled={running}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: "var(--brand-primary)" }}
            >
              {running
                ? `Importando ${progress.done}/${progress.total}…`
                : `Importar ${rows.length}`}
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-5 overflow-x-auto surface">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-2">{r.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{
                        background:
                          r.status === "created"
                            ? "rgba(34,155,141,.15)"
                            : r.status === "exists"
                              ? "rgba(159,181,183,.25)"
                              : "rgba(220,38,38,.15)",
                        color:
                          r.status === "created"
                            ? "var(--brand-primary)"
                            : r.status === "exists"
                              ? "var(--brand-navy)"
                              : "rgb(185,28,28)",
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{r.message ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
