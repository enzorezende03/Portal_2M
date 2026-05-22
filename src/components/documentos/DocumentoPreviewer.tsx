import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { supabase } from "@/integrations/supabase/client";

export type PreviewDocumento = {
  id: string;
  nome: string;
  arquivo_path: string;
  tamanho_bytes: number | null;
  mime_type: string | null;
};

export function useDocumentoFile(doc: PreviewDocumento | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    setUrl(null);
    setFileBlob(null);
    setError(null);
    setLoading(true);

    (async () => {
      const { data, error: downloadError } = await supabase.storage
        .from("documentos-clientes")
        .download(doc.arquivo_path);
      if (cancelled) return;
      if (downloadError || !data) {
        setError(downloadError?.message ?? "Não foi possível carregar o arquivo");
        setLoading(false);
        return;
      }

      const typed = doc.mime_type && data.type !== doc.mime_type ? new Blob([data], { type: doc.mime_type }) : data;
      setFileBlob(typed);

      const reader = new FileReader();
      reader.onload = () => {
        if (cancelled) return;
        setUrl(typeof reader.result === "string" ? reader.result : null);
        setLoading(false);
      };
      reader.onerror = () => {
        if (cancelled) return;
        setError("Falha ao ler o arquivo");
        setLoading(false);
      };
      reader.readAsDataURL(typed);
    })();

    return () => {
      cancelled = true;
    };
  }, [doc]);

  return { url, fileBlob, error, loading };
}

export function DocumentoPreviewContent({
  doc,
  url,
  fileBlob,
  loading,
  error,
  openUrl,
}: {
  doc: PreviewDocumento;
  url: string | null;
  fileBlob: Blob | null;
  loading: boolean;
  error: string | null;
  openUrl?: string;
}) {
  const mime = doc.mime_type ?? "";
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf" || doc.arquivo_path.toLowerCase().endsWith(".pdf");
  const isText = mime.startsWith("text/") || mime === "application/json" || mime === "application/xml";

  if (error) return <div className="p-6 text-center text-sm text-destructive">{error}</div>;
  if (loading || !url) return <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>;

  if (isImage) {
    return (
      <div className="flex h-full items-center justify-center overflow-auto p-4 md:p-6">
        <img src={url} alt={doc.nome} className="max-h-full max-w-full object-contain shadow-lg" />
      </div>
    );
  }

  if (isPdf && fileBlob) {
    return <PdfCanvasPreview file={fileBlob} fileName={doc.nome} openUrl={openUrl} downloadUrl={url} />;
  }

  if (isText) return <iframe src={url} title={doc.nome} className="h-full w-full border-0 bg-background" />;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <FileText className="h-10 w-10 text-muted-foreground" />
      <div className="text-sm text-muted-foreground">Pré-visualização não disponível para este tipo de arquivo.</div>
      <a
        href={url}
        download={doc.nome}
        className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground"
        style={{ background: "var(--brand-primary)" }}
      >
        <Download className="h-4 w-4" /> Baixar arquivo
      </a>
    </div>
  );
}

function PdfCanvasPreview({
  file,
  fileName,
  openUrl,
  downloadUrl,
}: {
  file: Blob;
  fileName: string;
  openUrl?: string;
  downloadUrl: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [scale, setScale] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [visibleScale, setVisibleScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        setPages(pdf.numPages);

        const safePage = Math.min(Math.max(page, 1), pdf.numPages);
        if (safePage !== page) {
          setPage(safePage);
          return;
        }

        const pdfPage = await pdf.getPage(safePage);
        if (cancelled) return;
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const containerWidth = viewportRef.current?.clientWidth ?? baseViewport.width;
        const renderScale = fitWidth
          ? Math.min(2.4, Math.max(0.6, (containerWidth - 64) / baseViewport.width))
          : scale;
        setVisibleScale(renderScale);
        const viewport = pdfPage.getViewport({ scale: renderScale });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        renderTask = pdfPage.render({ canvasContext: context, canvas: null, viewport });
        await renderTask.promise;
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled && (err as { name?: string }).name !== "RenderingCancelledException") {
          setError("Não foi possível renderizar a pré-visualização do PDF.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [file, fitWidth, page, scale]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-border p-2 hover:bg-accent disabled:opacity-40"
            title="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-20 text-center font-medium">
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="rounded-lg border border-border p-2 hover:bg-accent disabled:opacity-40"
            title="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => {
              setFitWidth(false);
              setScale((s) => Math.max(0.6, Number((s - 0.2).toFixed(1))));
            }}
            className="rounded-lg border border-border p-2 hover:bg-accent"
            title="Diminuir zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => setFitWidth((value) => !value)}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent"
            title="Alternar ajuste à largura"
          >
            {fitWidth ? "Ajustado" : `${Math.round(visibleScale * 100)}%`}
          </button>
          <button
            onClick={() => {
              setFitWidth(false);
              setScale((s) => Math.min(2.4, Number((s + 0.2).toFixed(1))));
            }}
            className="rounded-lg border border-border p-2 hover:bg-accent"
            title="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir
            </a>
          )}
          <a
            href={downloadUrl}
            download={fileName}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-primary-foreground"
            style={{ background: "var(--brand-primary)" }}
          >
            <Download className="h-3.5 w-3.5" /> Baixar
          </a>
        </div>
      </div>
      <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-auto p-4 md:p-6">
        {loading && (
          <div className="absolute inset-x-0 top-4 text-center text-sm text-muted-foreground">Carregando página…</div>
        )}
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
            <FileText className="h-10 w-10" />
            <span>{error}</span>
            <a
              href={downloadUrl}
              download={fileName}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground"
              style={{ background: "var(--brand-primary)" }}
            >
              <Download className="h-4 w-4" /> Baixar arquivo
            </a>
          </div>
        ) : (
          <canvas ref={canvasRef} className="mx-auto shadow-lg" />
        )}
      </div>
    </div>
  );
}