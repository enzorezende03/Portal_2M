import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, KeyRound } from "lucide-react";
import { openWithSso } from "@/lib/sso";

export const Route = createFileRoute("/_app/ferramentas")({
  component: FerramentasPage,
});

type Ferramenta = {
  id: string;
  nome: string;
  descricao: string | null;
  url_acesso: string;
  ativo: boolean;
  abre_em_nova_aba: boolean;
  requer_sso: boolean;
};

function FerramentasPage() {
  const [items, setItems] = useState<Ferramenta[]>([]);
  useEffect(() => {
    supabase
      .from("ferramentas")
      .select("*")
      .eq("ativo", true)
      .order("ordem")
      .then(({ data }) => setItems((data ?? []) as Ferramenta[]));
  }, []);

  async function handleClick(e: React.MouseEvent, f: Ferramenta) {
    if (!f.requer_sso) return; // link normal
    e.preventDefault();
    await openWithSso(f.url_acesso, f.abre_em_nova_aba);
  }

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
            Atalhos rápidos
          </div>
          <h1 className="mt-1 font-titulo text-4xl md:text-5xl leading-tight">
            Ferramentas
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/80">
            Acesse rapidamente os sistemas que você usa — login automático sempre que disponível.
          </p>
        </div>
      </div>



      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((f) => (
          <a
            key={f.id}
            href={f.url_acesso}
            target={f.abre_em_nova_aba ? "_blank" : "_self"}
            rel="noreferrer"
            onClick={(e) => handleClick(e, f)}
            className="surface card-hover group flex flex-col p-5"
          >
            <div className="icon-tile mb-4 h-11 w-11">
              <ExternalLink className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <div className="font-medium">{f.nome}</div>
              {f.requer_sso && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  title="Login automático"
                  style={{
                    background: "color-mix(in oklab, var(--brand-primary) 12%, transparent)",
                    color: "var(--brand-primary)",
                  }}
                >
                  <KeyRound className="h-2.5 w-2.5" /> SSO
                </span>
              )}
            </div>
            <div className="mt-1 flex-1 text-sm text-muted-foreground">{f.descricao}</div>
            <div
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold transition-transform group-hover:translate-x-0.5"
              style={{ color: "var(--brand-primary)" }}
            >
              Acessar <ExternalLink className="h-3.5 w-3.5" />
            </div>
          </a>
        ))}
        {items.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Nenhuma ferramenta disponível.
          </div>
        )}
      </div>
    </div>
  );
}
