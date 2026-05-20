import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_admin/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const [stats, setStats] = useState({ clientes: 0, ferramentas: 0, treinamentos: 0, avisos: 0 });
  useEffect(() => {
    (async () => {
      const [p, cl, f, t, a] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("ferramentas").select("id", { count: "exact", head: true }),
        supabase.from("treinamentos").select("id", { count: "exact", head: true }),
        supabase.from("avisos").select("id", { count: "exact", head: true }).eq("ativo", true),
      ]);
      setStats({
        clientes: (p.count ?? 0) + (cl.count ?? 0),
        ferramentas: f.count ?? 0,
        treinamentos: t.count ?? 0,
        avisos: a.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Clientes", value: stats.clientes },
    { label: "Ferramentas", value: stats.ferramentas },
    { label: "Treinamentos", value: stats.treinamentos },
    { label: "Avisos ativos", value: stats.avisos },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">{c.label}</div>
          <div className="mt-2 font-titulo text-3xl" style={{ color: "var(--brand-navy)" }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
