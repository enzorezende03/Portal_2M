import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Search, User2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { startImpersonation } from "@/lib/impersonation";

type Profile = {
  id: string;
  nome: string | null;
  email: string | null;
  cnpj: string | null;
  empresa_nome: string | null;
};

function getDisplayName(p: Profile): string {
  const nome = p.nome?.trim();
  if (nome) return nome;
  const razao = p.empresa_nome?.trim();
  if (razao) return razao;
  const emailUser = p.email?.split("@")[0];
  if (emailUser) return emailUser;
  return "(sem nome)";
}

function getInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function VerComoSelector() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || profiles.length > 0) return;
    setLoading(true);
    supabase
      .from("profiles")
      .select("id,nome,email,cnpj,empresas(nome)")
      .order("nome", { ascending: true })
      .limit(2000)
      .then(({ data }) => {
        const mapped: Profile[] = ((data as any[]) ?? []).map((p) => ({
          id: p.id,
          nome: p.nome,
          email: p.email,
          cnpj: p.cnpj,
          empresa_nome: p.empresas?.nome ?? null,
        }));
        setProfiles(mapped);
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
    const sorted = [...profiles].sort((a, b) =>
      getDisplayName(a).localeCompare(getDisplayName(b), "pt-BR"),
    );
    if (!term) return sorted.slice(0, 50);
    return sorted
      .filter((p) =>
        [p.nome, p.email, p.cnpj, p.empresa_nome].some((v) =>
          String(v ?? "").toLowerCase().includes(term),
        ),
      )
      .slice(0, 50);
  }, [profiles, q]);

  const enter = async (p: Profile) => {
    setStarting(true);
    try {
      await startImpersonation(p.id, getDisplayName(p));
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
        <div className="absolute right-0 z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="border-b border-border bg-muted/30 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome, razão social, email ou CNPJ…"
                className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-2"
                style={{ ["--tw-ring-color" as any]: "var(--brand-primary)" }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
              <span>{loading ? "Carregando…" : `${filtered.length} resultado(s)`}</span>
              <span>Mostrando até 50</span>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto p-1.5">
            {loading && (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                Carregando clientes…
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                Nenhum cliente encontrado.
              </div>
            )}
            {!loading &&
              filtered.map((p) => {
                const display = getDisplayName(p);
                const showRazao = !!p.empresa_nome && p.empresa_nome !== display;
                return (
                  <button
                    key={p.id}
                    disabled={starting}
                    onClick={() => enter(p)}
                    className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ background: "var(--brand-gradient)" }}
                    >
                      {getInitials(display) || <User2 className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {display}
                      </div>
                      <div className="flex items-center gap-2 truncate text-[11px] text-muted-foreground">
                        {showRazao && (
                          <span className="truncate">{p.empresa_nome}</span>
                        )}
                        {showRazao && p.email && <span>•</span>}
                        {p.email && <span className="truncate">{p.email}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
