import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_app/ferramentas")({
  component: FerramentasPage,
});

function FerramentasPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("ferramentas").select("*").eq("ativo", true).order("ordem").then(({ data }) => setItems(data ?? []));
  }, []);

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <h1 className="font-titulo text-4xl" style={{ color: "var(--brand-navy)" }}>Ferramentas</h1>
      <p className="mt-1 text-sm text-muted-foreground">Acesse rapidamente os sistemas que você usa.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((f) => (
          <a
            key={f.id}
            href={f.url_acesso}
            target={f.abre_em_nova_aba ? "_blank" : "_self"}
            rel="noreferrer"
            className="group flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ background: "var(--brand-primary)" }}>
              <ExternalLink className="h-5 w-5" />
            </div>
            <div className="font-medium">{f.nome}</div>
            <div className="mt-1 flex-1 text-sm text-muted-foreground">{f.descricao}</div>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--brand-primary)" }}>
              Acessar <ExternalLink className="h-3.5 w-3.5" />
            </div>
          </a>
        ))}
        {items.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Nenhuma ferramenta disponível.
          </div>
        )}
      </div>
    </div>
  );
}
