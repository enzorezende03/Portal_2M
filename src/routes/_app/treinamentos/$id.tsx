import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/treinamentos/$id")({
  component: TreinamentoPlayer,
});

type VideoKind = "youtube" | "vimeo" | "bunny" | "file" | "other";

function detectVideo(url: string): { kind: VideoKind; embed: string } {
  if (!url) return { kind: "other", embed: url };
  if (/youtube\.com|youtu\.be/i.test(url)) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    const id = m?.[1];
    return { kind: "youtube", embed: id ? `https://www.youtube.com/embed/${id}?enablejsapi=1` : url };
  }
  if (/vimeo\.com/i.test(url)) {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    const id = m?.[1];
    return { kind: "vimeo", embed: id ? `https://player.vimeo.com/video/${id}` : url };
  }
  if (/iframe\.mediadelivery\.net/i.test(url)) {
    return { kind: "bunny", embed: url };
  }
  if (/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url) || /treinamentos-videos/i.test(url)) {
    return { kind: "file", embed: url };
  }
  return { kind: "other", embed: url };
}

function TreinamentoPlayer() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [t, setT] = useState<any>(null);
  const [done, setDone] = useState(false);
  const segundosRef = useRef(0);
  const lastSavedRef = useRef(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("treinamentos").select("*").eq("id", id).maybeSingle();
      setT(data);
      if (user) {
        const { data: p } = await supabase
          .from("treinamento_progresso")
          .select("concluido, segundos_assistidos")
          .eq("treinamento_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        setDone(!!p?.concluido);
        segundosRef.current = p?.segundos_assistidos ?? 0;
        lastSavedRef.current = segundosRef.current;
      }
    })();
  }, [id, user]);

  // Salva segundos a cada 10s (incrementa enquanto a aba está visível)
  useEffect(() => {
    if (!user || !t) return;

    const tick = setInterval(() => {
      if (document.visibilityState === "visible") {
        segundosRef.current += 1;
      }
    }, 1000);

    const save = setInterval(async () => {
      if (segundosRef.current === lastSavedRef.current) return;
      const value = segundosRef.current;
      const { error } = await supabase.from("treinamento_progresso").upsert(
        { user_id: user.id, treinamento_id: id, segundos_assistidos: value },
        { onConflict: "user_id,treinamento_id" }
      );
      if (!error) lastSavedRef.current = value;
    }, 10_000);

    const flush = () => {
      const value = segundosRef.current;
      if (value === lastSavedRef.current) return;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/treinamento_progresso?on_conflict=user_id,treinamento_id`;
      const blob = new Blob(
        [JSON.stringify({ user_id: user.id, treinamento_id: id, segundos_assistidos: value })],
        { type: "application/json" }
      );
      try {
        navigator.sendBeacon?.(url, blob);
      } catch {}
    };
    window.addEventListener("beforeunload", flush);

    return () => {
      clearInterval(tick);
      clearInterval(save);
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [user, t, id]);

  const marcar = async () => {
    if (!user) return;
    const { error } = await supabase.from("treinamento_progresso").upsert(
      {
        user_id: user.id,
        treinamento_id: id,
        concluido: true,
        concluido_em: new Date().toISOString(),
        segundos_assistidos: segundosRef.current,
      },
      { onConflict: "user_id,treinamento_id" }
    );
    if (error) return toast.error(error.message);
    setDone(true);
    toast.success("Marcado como concluído!");
  };

  if (!t) return <div className="p-10 text-muted-foreground">Carregando…</div>;

  const { kind, embed } = detectVideo(t.video_url);
  const allow =
    kind === "bunny"
      ? "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
      : "autoplay; encrypted-media; picture-in-picture";

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <Link to="/treinamentos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-black shadow-sm">
        <div className="aspect-video">
          {kind === "file" ? (
            <video src={embed} controls className="h-full w-full" />
          ) : (
            <iframe
              src={embed}
              allow={allow}
              allowFullScreen
              className="h-full w-full"
            />
          )}
        </div>
      </div>

      <h1 className="mt-6 font-titulo text-3xl" style={{ color: "var(--brand-navy)" }}>{t.titulo}</h1>
      {t.descricao && <p className="mt-2 text-muted-foreground">{t.descricao}</p>}

      {t.pdf_url && (
        <a
          href={t.pdf_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          📄 Baixar material em PDF
        </a>
      )}

      <button
        onClick={marcar}
        disabled={done}
        className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium text-white disabled:opacity-60"
        style={{ background: done ? "#16a34a" : "var(--brand-primary)" }}
      >
        <CheckCircle2 className="h-4 w-4" />
        {done ? "Concluído" : "Marcar como concluído"}
      </button>
    </div>
  );
}
