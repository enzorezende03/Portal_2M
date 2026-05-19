import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, KeyRound } from "lucide-react";
import { openWithSso } from "@/lib/sso";
import { toast } from "sonner";

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
    try {
      await openWithSso(f.url_acesso, f.abre_em_nova_aba);
    } catch (err: any) {
      toast.error("Não foi possível abrir com login automático");
      window.open(f.url_acesso, f.abre_em_nova_aba ? "_blank" : "_self");
    }
  }

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
            onClick={(e) => handleClick(e, f)}
            className="group flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ background: "var(--brand-primary)" }}>
              <ExternalLink className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <div className="font-medium">{f.nome}</div>
              {f.requer_sso && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground" title="Login automático">
                  <KeyRound className="h-2.5 w-2.5" /> SSO
                </span>
              )}
            </div>
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
