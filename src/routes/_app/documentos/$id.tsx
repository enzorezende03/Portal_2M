import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DocumentoPreviewContent, useDocumentoFile, type PreviewDocumento } from "@/components/documentos/DocumentoPreviewer";

export const Route = createFileRoute("/_app/documentos/$id")({
  component: DocumentoNovaAbaPage,
});

function fmtBytes(b?: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentoNovaAbaPage() {
  const { id } = Route.useParams();
  const [doc, setDoc] = useState<PreviewDocumento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { url, fileBlob, error, loading } = useDocumentoFile(doc);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: queryError } = await supabase
        .from("documentos")
        .select("id,nome,arquivo_path,tamanho_bytes,mime_type")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (queryError || !data) {
        setErro(queryError?.message ?? "Documento não encontrado.");
        return;
      }
      setDoc(data as PreviewDocumento);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (erro) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-3 p-6 text-center">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <h1 className="font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>Não foi possível abrir o documento</h1>
        <p className="text-sm text-muted-foreground">{erro}</p>
        <Link to="/documentacao" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent">
          <ArrowLeft className="h-4 w-4" /> Voltar para documentos
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:px-6">
        <div className="min-w-0">
          <h1 className="truncate font-titulo text-xl md:text-2xl" style={{ color: "var(--brand-navy)" }}>
            {doc?.nome ?? "Documento"}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {doc ? `${fmtBytes(doc.tamanho_bytes)} · ${doc.mime_type ?? "tipo desconhecido"}` : "Carregando…"}
          </p>
        </div>
        <Link to="/documentacao" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent">
          <ArrowLeft className="h-4 w-4" /> Documentos
        </Link>
      </header>
      <main className="min-h-0 flex-1">
        {doc ? (
          <DocumentoPreviewContent doc={doc} url={url} fileBlob={fileBlob} loading={loading} error={error} />
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
        )}
      </main>
    </div>
  );
}