import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Empresa = {
  id: string;
  slug: string;
  nome: string;
  logo_url: string | null;
  cor_primary: string;
  cor_navy: string;
  cor_soft: string;
  cor_bg: string;
  cor_text: string;
  fonte_titulo: string;
  fonte_corpo: string;
  fonte_decorativa: string;
  whatsapp: string | null;
  email_suporte: string | null;
};

type Ctx = { empresa: Empresa | null; loading: boolean };
const BrandContext = createContext<Ctx>({ empresa: null, loading: true });

function detectSlug(): string {
  if (typeof window === "undefined") return "saude";
  const host = window.location.hostname;
  const sub = host.split(".")[0];
  if (sub === "saude" || sub === "contabilidade") return sub;
  const params = new URLSearchParams(window.location.search);
  const q = params.get("empresa");
  if (q === "saude" || q === "contabilidade") {
    localStorage.setItem("empresa_slug", q);
    return q;
  }
  const stored = localStorage.getItem("empresa_slug");
  if (stored === "saude" || stored === "contabilidade") return stored;
  return "saude";
}

function injectFonts(empresa: Empresa) {
  const families = [empresa.fonte_titulo, empresa.fonte_corpo, empresa.fonte_decorativa];
  const id = "brand-fonts";
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  const familiesParam = families
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join("&");
  link.href = `https://fonts.googleapis.com/css2?${familiesParam}&display=swap`;
  document.head.appendChild(link);
}

function applyTheme(e: Empresa) {
  const r = document.documentElement.style;
  r.setProperty("--brand-primary", e.cor_primary);
  r.setProperty("--brand-navy", e.cor_navy);
  r.setProperty("--brand-soft", e.cor_soft);
  r.setProperty("--brand-bg", e.cor_bg);
  r.setProperty("--brand-text", e.cor_text);
  r.setProperty("--brand-font-titulo", `"${e.fonte_titulo}", serif`);
  r.setProperty("--brand-font-corpo", `"${e.fonte_corpo}", sans-serif`);
  r.setProperty("--brand-font-decorativa", `"${e.fonte_decorativa}", cursive`);
  injectFonts(e);
  document.title = `Portal ${e.nome}`;
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slug = detectSlug();
    supabase
      .from("empresas_public" as any)
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEmpresa(data as unknown as Empresa);
          applyTheme(data as unknown as Empresa);
        }
        setLoading(false);
      });
  }, []);

  return <BrandContext.Provider value={{ empresa, loading }}>{children}</BrandContext.Provider>;
}

export function useEmpresa() {
  return useContext(BrandContext);
}
