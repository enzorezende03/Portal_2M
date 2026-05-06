import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_app/treinamentos/")({
  component: TreinamentosPage,
});

function fmtDur(s?: number | null) {
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function TreinamentosPage() {
  const [cats, setCats] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [progresso, setProgresso] = useState<Record<string, boolean>>({});
  const [filtro, setFiltro] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: t }, { data: p }] = await Promise.all([
        supabase.from("categorias_treinamento").select("*").order("ordem"),
        supabase.from("treinamentos").select("*").eq("ativo", true).order("ordem"),
        supabase.from("treinamento_progresso").select("treinamento_id, concluido").eq("concluido", true),
      ]);
      setCats(c ?? []);
      setItems(t ?? []);
      const map: Record<string, boolean> = {};
      (p ?? []).forEach((x: any) => (map[x.treinamento_id] = true));
      setProgresso(map);
    })();
  }, []);

  const filtered = filtro === "all" ? items : items.filter((i) => i.categoria_id === filtro);

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <h1 className="font-titulo text-4xl" style={{ color: "var(--brand-navy)" }}>Treinamentos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Aprenda no seu ritmo.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFiltro("all")}
          className={`rounded-full border px-4 py-1.5 text-sm ${filtro === "all" ? "text-white" : "border-border bg-card"}`}
          style={filtro === "all" ? { background: "var(--brand-primary)", borderColor: "var(--brand-primary)" } : undefined}
        >
          Todos
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setFiltro(c.id)}
            className={`rounded-full border px-4 py-1.5 text-sm ${filtro === c.id ? "text-white" : "border-border bg-card"}`}
            style={filtro === c.id ? { background: "var(--brand-primary)", borderColor: "var(--brand-primary)" } : undefined}
          >
            {c.nome}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <Link
            key={t.id}
            to="/treinamentos/$id"
            params={{ id: t.id }}
            className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative aspect-video bg-muted">
              {t.thumbnail_url ? (
                <img src={t.thumbnail_url} alt={t.titulo} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <PlayCircle className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              {progresso[t.id] && (
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-1 text-xs text-white">
                  <CheckCircle2 className="h-3 w-3" /> Concluído
                </span>
              )}
            </div>
            <div className="p-4">
              <div className="line-clamp-2 font-medium">{t.titulo}</div>
              <div className="mt-1 text-xs text-muted-foreground">{fmtDur(t.duracao_segundos)}</div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Nenhum treinamento.
          </div>
        )}
      </div>
    </div>
  );
}
