import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
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

type ProfileRow = Omit<Profile, "empresa_nome"> & {
  empresas?: { nome: string | null } | null;
};

type RingStyle = CSSProperties & { "--tw-ring-color": string };

type FilterType = "nome" | "email" | "cnpj";


const LOWERCASE_PARTICLES = new Set([
  "da", "de", "di", "do", "du",
  "das", "dos",
  "e", "y",
  "del", "della", "der", "den", "van", "von", "la", "le", "lo",
]);

const ABBREV_SUFFIXES = new Set(["jr", "júnior", "junior", "neto", "filho", "sobrinho"]);

function formatPersonName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return cleaned;
  const parts = cleaned.split(" ");
  return parts
    .map((word, idx) => {
      const lower = word.toLowerCase().replace(/\.$/, "");
      // Single-letter initials → "L."
      if (lower.length === 1 && /[a-zà-ÿ]/i.test(lower)) {
        return lower.toUpperCase() + ".";
      }
      // Particles (not if first word)
      if (idx > 0 && LOWERCASE_PARTICLES.has(lower)) return lower;
      // Junior-style abbreviations → add trailing dot
      if (ABBREV_SUFFIXES.has(lower)) {
        if (lower === "jr") return "Jr.";
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      // Hyphenated names (Maria-Clara)
      if (lower.includes("-")) {
        return lower
          .split("-")
          .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
          .join("-");
      }
      // Already-abbreviated with dot in original (e.g. "J.")
      if (/\.$/.test(word) && word.length <= 3) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function formatRazaoSocial(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}

function getDisplayName(p: Profile): string {
  const nome = p.nome?.trim();
  if (nome) return formatPersonName(nome);
  const razao = p.empresa_nome?.trim();
  if (razao) return formatRazaoSocial(razao);
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

function normalizeSearch(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function onlyDigits(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function VerComoSelector() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterType>("nome");
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
        const mapped: Profile[] = ((data as ProfileRow[]) ?? []).map((p) => ({
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
    const term = normalizeSearch(q);
    const digits = onlyDigits(q);
    const hasLetters = /[a-z]/i.test(term);
    const sorted = [...profiles].sort((a, b) =>
      getDisplayName(a).localeCompare(getDisplayName(b), "pt-BR"),
    );
    if (!term) return sorted.slice(0, 50);

    if (filter === "cnpj") {
      if (!digits) return [];
      const cnpjMatches = sorted.filter((p) => onlyDigits(p.cnpj).includes(digits));
      const startsWith = cnpjMatches.filter((p) => onlyDigits(p.cnpj).startsWith(digits));
      const containsOnly = cnpjMatches.filter((p) => !startsWith.some((s) => s.id === p.id));
      return [...startsWith, ...containsOnly].slice(0, 50);
    }

    if (filter === "email") {
      const emailMatches = sorted.filter((p) => normalizeSearch(p.email).startsWith(term));
      return emailMatches.slice(0, 50);
    }

    // filter === "nome"
    if (digits && !hasLetters) {
      const cnpjMatches = sorted.filter((p) => onlyDigits(p.cnpj).includes(digits));
      const startsWith = cnpjMatches.filter((p) => onlyDigits(p.cnpj).startsWith(digits));
      const containsOnly = cnpjMatches.filter((p) => !startsWith.some((s) => s.id === p.id));
      return [...startsWith, ...containsOnly].slice(0, 50);
    }

    const startsWith = sorted.filter((p) => normalizeSearch(getDisplayName(p)).startsWith(term));
    return startsWith.slice(0, 50);
  }, [profiles, q, filter]);

  const enter = async (p: Profile) => {
    setStarting(true);
    try {
      await startImpersonation(p.id, getDisplayName(p));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao entrar como este usuário.");
      setStarting(false);
    }
  };

  const dropdown =
    open && pos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={ref}
            className="fixed z-[100] w-96 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            style={{ top: pos.top, right: pos.right }}
          >
            <div className="border-b border-border bg-muted/30 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={
                    filter === "cnpj"
                      ? "Buscar por CNPJ…"
                      : filter === "email"
                        ? "Buscar por email…"
                        : "Buscar por nome ou razão social…"
                  }
                  className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2"
                  style={{ "--tw-ring-color": "var(--brand-primary)" } as RingStyle}
                />
              </div>
              <div className="mt-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFilter("nome")}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    filter === "nome"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  Nome / Razão Social
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("email")}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    filter === "email"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("cnpj")}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    filter === "cnpj"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  CNPJ
                </button>
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
                  const showCnpj = !!p.cnpj;
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
                          {showRazao && <span className="truncate">{p.empresa_nome}</span>}
                          {showRazao && (p.email || showCnpj) && <span>•</span>}
                          {showCnpj && <span className="shrink-0">{p.cnpj}</span>}
                          {showCnpj && p.email && <span>•</span>}
                          {p.email && <span className="truncate">{p.email}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md shadow-lg transition-all hover:bg-white/20 hover:border-white/40 hover:shadow-xl"
      >
        <Eye className="h-4 w-4" /> Ver como cliente
      </button>
      {dropdown}
    </div>
  );
}
