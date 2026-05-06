import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_admin/admin/clientes")({
  component: () => <SimpleList table="profiles" titulo="Clientes" cols={["nome", "email", "telefone", "cargo"]} />,
});

export function SimpleList({ table, titulo, cols }: { table: string; titulo: string; cols: string[] }) {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    supabase.from(table as any).select("*").limit(200).then(({ data }) => setRows(data ?? []));
  }, [table]);
  const filtered = rows.filter((r) =>
    !q ? true : Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q.toLowerCase()))
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
      <p className="mt-3 text-xs text-muted-foreground">CRUD completo será adicionado em iteração futura.</p>
    </div>
  );
}
