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
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <div
        className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-white"
        style={{ background: "var(--brand-gradient)", boxShadow: "var(--shadow-elegant)" }}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-52 w-52 rounded-full bg-white/5 blur-3xl" />
        <div className="relative">
          <div className="text-xs font-medium uppercase tracking-wide text-white/70">
            Conteúdo exclusivo
          </div>
          <h1 className="mt-1 font-titulo text-4xl md:text-5xl leading-tight">
            Treinamentos
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/80">
            Aprenda no seu ritmo, com vídeos organizados por categoria.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltro("all")}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
            filtro === "all" ? "text-white shadow-sm" : "border-border bg-card hover:bg-accent"
          }`}
          style={
            filtro === "all"
              ? { background: "var(--brand-gradient)", borderColor: "transparent", boxShadow: "var(--brand-glow)" }
              : undefined
          }
        >
          Todos
        </button>
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setFiltro(c.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
              filtro === c.id ? "text-white shadow-sm" : "border-border bg-card hover:bg-accent"
            }`}
            style={
              filtro === c.id
                ? { background: "var(--brand-gradient)", borderColor: "transparent", boxShadow: "var(--brand-glow)" }
                : undefined
            }
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
            className="surface card-hover group overflow-hidden"
          >
            <div className="relative aspect-video overflow-hidden bg-muted">
              {t.thumbnail_url ? (
                <img
                  src={t.thumbnail_url}
                  alt={t.titulo}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center" style={{ background: "var(--brand-gradient)" }}>
                  <PlayCircle className="h-12 w-12 text-white/90" />
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              {progresso[t.id] && (
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-green-600/95 px-2 py-1 text-xs font-medium text-white shadow">
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
          <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Nenhum treinamento.
          </div>
        )}
      </div>
    </div>
  );
}
