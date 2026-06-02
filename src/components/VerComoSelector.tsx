import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { startImpersonation } from "@/lib/impersonation";

type Profile = {
  id: string;
  nome: string | null;
  email: string | null;
  cnpj: string | null;
};

export function VerComoSelector() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || profiles.length > 0) return;
    setLoading(true);
    supabase
      .from("profiles")
      .select("id,nome,email,cnpj")
      .order("nome", { ascending: true })
      .limit(2000)
      .then(({ data }) => {
        setProfiles((data as Profile[]) ?? []);
        setLoading(false);
      });
  }, [open, profiles.length]);

  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", click);
    return () => window.removeEventListener("mousedown", click);
  }, [open]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return profiles.slice(0, 50);
    return profiles
      .filter((p) =>
        [p.nome, p.email, p.cnpj].some((v) => String(v ?? "").toLowerCase().includes(term)),
      )
      .slice(0, 50);
  }, [profiles, q]);

  const enter = async (p: Profile) => {
    setStarting(true);
    try {
      await startImpersonation(p.id, p.nome);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao entrar como este usuário.");
      setStarting(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md shadow-lg transition-all hover:bg-white/20 hover:border-white/40 hover:shadow-xl"
      >
        <Eye className="h-4 w-4" /> Ver como cliente
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-card p-3 shadow-2xl">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, email ou CNPJ…"
              className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-2 text-sm outline-none focus:ring-2"
              style={{ ["--tw-ring-color" as any]: "var(--brand-primary)" }}
            />
          </div>
          <div className="mt-2 max-h-72 overflow-y-auto">
            {loading && (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">Carregando…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                Nenhum usuário encontrado.
              </div>
            )}
            {!loading &&
              filtered.map((p) => (
                <button
                  key={p.id}
                  disabled={starting}
                  onClick={() => enter(p)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                >
                  <span className="font-medium">{p.nome ?? "(sem nome)"}</span>
                  <span className="text-xs text-muted-foreground">{p.email ?? "—"}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
