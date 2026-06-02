import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Wrench, GraduationCap, Megaphone } from "lucide-react";

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
    { label: "Clientes", value: stats.clientes, icon: Users },
    { label: "Ferramentas", value: stats.ferramentas, icon: Wrench },
    { label: "Treinamentos", value: stats.treinamentos, icon: GraduationCap },
    { label: "Avisos ativos", value: stats.avisos, icon: Megaphone },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="surface card-hover relative overflow-hidden p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {c.label}
              </div>
              <div className="mt-2 font-titulo text-4xl" style={{ color: "var(--brand-navy)" }}>
                {c.value}
              </div>
            </div>
            <div className="icon-tile h-10 w-10">
              <c.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
