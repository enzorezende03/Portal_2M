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

  return (
    <div className="space-y-6">
      {empresas.map((e) => (
        <div key={e.id} className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg" style={{ background: e.cor_primary }} />
            <div>
              <div className="font-titulo text-xl" style={{ color: "var(--brand-navy)" }}>{e.nome}</div>
              <div className="text-xs text-muted-foreground">slug: {e.slug}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {(["cor_primary", "cor_navy", "cor_soft", "cor_bg", "cor_text"] as const).map((k) => (
              <label key={k} className="flex flex-col gap-1 text-xs">
                <span className="font-medium">{k}</span>
                <input
                  type="color"
                  defaultValue={e[k]}
                  onBlur={(ev) => ev.target.value !== e[k] && update(e.id, { [k]: ev.target.value })}
                  className="h-9 w-full cursor-pointer rounded border border-border"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {(["fonte_titulo", "fonte_corpo", "fonte_decorativa"] as const).map((k) => (
              <label key={k} className="flex flex-col gap-1 text-xs">
                <span className="font-medium">{k}</span>
                <input
                  defaultValue={e[k]}
                  onBlur={(ev) => ev.target.value !== e[k] && update(e.id, { [k]: ev.target.value })}
                  className="rounded border border-border bg-card px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium">Logo URL</span>
              <input
                defaultValue={e.logo_url ?? ""}
                onBlur={(ev) => (ev.target.value || null) !== e.logo_url && update(e.id, { logo_url: ev.target.value || null })}
                className="rounded border border-border bg-card px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium">CNPJ (para SSO Reforma)</span>
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
