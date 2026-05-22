import { useEffect, useRef, useState } from "react";
import { Download, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
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
}: {
  doc: PreviewDocumento;
  url: string | null;
  fileBlob: Blob | null;
  loading: boolean;
  error: string | null;
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
    return <PdfCanvasPreview file={fileBlob} fileName={doc.nome} downloadUrl={url} />;
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

type PdfDocLike = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getViewport: (opts: { scale: number }) => { width: number; height: number };
    render: (opts: { canvasContext: CanvasRenderingContext2D; canvas: null; viewport: { width: number; height: number } }) => { promise: Promise<void>; cancel: () => void };
  }>;
};

function PdfCanvasPreview({
  file,
  fileName,
  downloadUrl,
}: {
  file: Blob;
  fileName: string;
  downloadUrl: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<PdfDocLike | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [scale, setScale] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [visibleScale, setVisibleScale] = useState(1);
  const [docReady, setDocReady] = useState(false);
  const [cssZoom, setCssZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDocReady(false);
    setError(null);
    pdfRef.current = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        pdfRef.current = pdf as unknown as PdfDocLike;
        setPages(pdf.numPages);
        setPage(1);
        setDocReady(true);
      } catch {
        if (!cancelled) setError("Não foi possível carregar o PDF.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    if (!docReady || !pdfRef.current) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    (async () => {
      try {
        const pdf = pdfRef.current!;
        const safePage = Math.min(Math.max(page, 1), pdf.numPages);
        const pdfPage = await pdf.getPage(safePage);
        if (cancelled) return;
        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const containerEl = viewportRef.current;
        const containerWidth = containerEl?.clientWidth ?? baseViewport.width;
        const containerHeight = containerEl?.clientHeight ?? baseViewport.height;
        // High-DPI base scale so the page is sharp; fit-width shrinks if needed.
        const fitScale = Math.min(
          (containerWidth - 48) / baseViewport.width,
          (containerHeight - 48) / baseViewport.height,
        );
        const renderScale = fitWidth ? Math.max(0.2, fitScale) : scale;
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
        if (cancelled) return;
        setVisibleScale(renderScale);
        setCssZoom(1);
      } catch (err) {
        if (!cancelled && (err as { name?: string }).name !== "RenderingCancelledException") {
          setError("Não foi possível renderizar a página.");
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [docReady, page, scale, fitWidth]);

  const applyZoomDelta = (delta: number) => {
    setFitWidth(false);
    setScale((s) => {
      const next = Math.min(2.4, Math.max(0.6, Number((s + delta).toFixed(2))));
      if (next !== s) setCssZoom((z) => (z * next) / s);
      return next;
    });
  };

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
            onClick={() => applyZoomDelta(-0.2)}
            className="rounded-lg border border-border p-2 hover:bg-accent"
            title="Diminuir zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setFitWidth((value) => !value);
              setCssZoom(1);
            }}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent"
            title="Alternar ajuste à largura"
          >
            {fitWidth ? "Ajustado" : `${Math.round(visibleScale * cssZoom * 100)}%`}
          </button>
          <button
            onClick={() => applyZoomDelta(0.2)}
            className="rounded-lg border border-border p-2 hover:bg-accent"
            title="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
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
          <canvas
            ref={canvasRef}
            className="mx-auto shadow-lg"
            style={{
              transform: cssZoom === 1 ? undefined : `scale(${cssZoom})`,
              transformOrigin: "top center",
              transition: "transform 80ms ease-out",
            }}
          />
        )}
      </div>
    </div>
  );
}