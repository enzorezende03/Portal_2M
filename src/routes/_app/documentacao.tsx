import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { FileText, Download, FolderOpen, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";



export const Route = createFileRoute("/_app/documentacao")({
  component: DocumentacaoCliente,
});

type Documento = {
  id: string;
  nome: string;
  descricao: string | null;
  arquivo_path: string;
  tamanho_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

function fmtBytes(b?: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentacaoCliente() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("cnpj, email")
        .eq("id", user.id)
        .maybeSingle();
      const cnpjDigits = String(prof?.cnpj ?? "").replace(/\D/g, "");
      const email = String(prof?.email ?? "").trim().toLowerCase();

      // Busca clientes que casam por CNPJ/email para incluir os documentos vinculados a eles
      const clienteIds: string[] = [];
      if (cnpjDigits || email) {
        const filtros: string[] = [];
        if (cnpjDigits) filtros.push(`cnpj.eq.${cnpjDigits}`);
        if (email) filtros.push(`email.ilike.${email}`);
        const { data: clis } = await supabase
          .from("clientes")
          .select("id")
          .or(filtros.join(","));
        for (const c of clis ?? []) clienteIds.push((c as any).id);
      }

      const orParts = [`user_id.eq.${user.id}`];
      if (clienteIds.length) orParts.push(`cliente_id.in.(${clienteIds.join(",")})`);

      const { data, error } = await supabase
        .from("documentos")
        .select("id,nome,descricao,arquivo_path,tamanho_bytes,mime_type,created_at")
        .or(orParts.join(","))
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setDocs((data as Documento[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const baixar = async (d: Documento) => {
    const { data, error } = await supabase.storage
      .from("documentos-clientes")
      .createSignedUrl(d.arquivo_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
        <span className="h-2 w-2 rounded-full" style={{ background: "var(--brand-primary)" }} />
        Área pessoal
      </div>
      <h1 className="font-titulo text-4xl" style={{ color: "var(--brand-navy)" }}>
        Documentação
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Documentos enviados pela nossa equipe para você. Apenas você e a equipe têm acesso.
      </p>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            Carregando…
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            <FolderOpen className="mx-auto mb-2 h-10 w-10 opacity-40" />
            Nenhum documento disponível por enquanto.
          </div>
        ) : (
          docs.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "var(--brand-soft)", color: "var(--brand-navy)" }}
                >
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.nome}</div>
                  {d.descricao && (
                    <div className="line-clamp-2 text-xs text-muted-foreground">{d.descricao}</div>
                  )}
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {fmtBytes(d.tamanho_bytes)} ·{" "}
                    {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>
              <button
                onClick={() => baixar(d)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white"
                style={{ background: "var(--brand-primary)" }}
              >
                <Download className="h-4 w-4" /> Baixar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
