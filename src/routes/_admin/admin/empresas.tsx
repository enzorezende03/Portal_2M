import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/empresas")({
  component: EmpresasAdmin,
});

function EmpresasAdmin() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const load = () => supabase.from("empresas").select("*").order("nome").then(({ data }) => setEmpresas(data ?? []));
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("empresas").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Empresa atualizada"); load(); }
  };

  const cores: { key: "cor_primary" | "cor_navy" | "cor_soft" | "cor_bg" | "cor_text"; label: string; hint: string }[] = [
    { key: "cor_primary", label: "Cor principal", hint: "Botões e destaques" },
    { key: "cor_navy", label: "Cor escura", hint: "Títulos e cabeçalhos" },
    { key: "cor_soft", label: "Cor suave", hint: "Bordas e detalhes" },
    { key: "cor_bg", label: "Fundo", hint: "Plano de fundo geral" },
    { key: "cor_text", label: "Texto", hint: "Cor do texto principal" },
  ];

  const fontes: { key: "fonte_titulo" | "fonte_corpo" | "fonte_decorativa"; label: string; hint: string }[] = [
    { key: "fonte_titulo", label: "Fonte dos títulos", hint: "Ex.: Bellezza, Cinzel" },
    { key: "fonte_corpo", label: "Fonte do texto", hint: "Ex.: Inter, Roboto" },
    { key: "fonte_decorativa", label: "Fonte decorativa", hint: "Ex.: Pinyon Script" },
  ];

  return (
    <div className="space-y-6">
      {empresas.map((e) => (
        <div key={e.id} className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg" style={{ background: e.cor_primary }} />
            <div>
              <div className="font-titulo text-xl" style={{ color: "var(--brand-navy)" }}>{e.nome}</div>
              <div className="text-xs text-muted-foreground">Identificador: {e.slug}</div>
            </div>
          </div>

          <div className="mb-2 text-sm font-medium" style={{ color: "var(--brand-navy)" }}>Cores</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {cores.map((c) => (
              <label key={c.key} className="flex flex-col gap-1">
                <span className="text-xs font-medium">{c.label}</span>
                <input
                  type="color"
                  defaultValue={e[c.key]}
                  onBlur={(ev) => ev.target.value !== e[c.key] && update(e.id, { [c.key]: ev.target.value })}
                  className="h-9 w-full cursor-pointer rounded border border-border"
                />
                <span className="text-[11px] text-muted-foreground">{c.hint}</span>
              </label>
            ))}
          </div>

          <div className="mb-2 mt-5 text-sm font-medium" style={{ color: "var(--brand-navy)" }}>Tipografia</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {fontes.map((f) => (
              <label key={f.key} className="flex flex-col gap-1">
                <span className="text-xs font-medium">{f.label}</span>
                <input
                  defaultValue={e[f.key]}
                  onBlur={(ev) => ev.target.value !== e[f.key] && update(e.id, { [f.key]: ev.target.value })}
                  className="rounded border border-border bg-card px-3 py-2 text-sm"
                />
                <span className="text-[11px] text-muted-foreground">{f.hint}</span>
              </label>
            ))}
          </div>

          <div className="mb-2 mt-5 text-sm font-medium" style={{ color: "var(--brand-navy)" }}>Identidade</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">Link do logo</span>
              <input
                defaultValue={e.logo_url ?? ""}
                placeholder="https://…"
                onBlur={(ev) => (ev.target.value || null) !== e.logo_url && update(e.id, { logo_url: ev.target.value || null })}
                className="rounded border border-border bg-card px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium">CNPJ (usado no acesso ao DistribuiLucros)</span>
              <input
                defaultValue={e.cnpj ?? ""}
                placeholder="Apenas dígitos"
                onBlur={(ev) => {
                  const v = ev.target.value.replace(/\D/g, "") || null;
                  if (v !== e.cnpj) update(e.id, { cnpj: v });
                }}
                className="rounded border border-border bg-card px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
