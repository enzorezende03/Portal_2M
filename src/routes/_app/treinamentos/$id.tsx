import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/treinamentos/$id")({
  component: TreinamentoPlayer,
});

function getEmbedUrl(url: string) {
  if (!url) return url;
  // YouTube
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Vimeo
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

function TreinamentoPlayer() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [t, setT] = useState<any>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("treinamentos").select("*").eq("id", id).maybeSingle();
      setT(data);
      if (user) {
        const { data: p } = await supabase
          .from("treinamento_progresso")
          .select("concluido")
          .eq("treinamento_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        setDone(!!p?.concluido);
      }
    })();
  }, [id, user]);

  const marcar = async () => {
    if (!user) return;
    const { error } = await supabase.from("treinamento_progresso").upsert(
      { user_id: user.id, treinamento_id: id, concluido: true, concluido_em: new Date().toISOString() },
      { onConflict: "user_id,treinamento_id" }
    );
    if (error) return toast.error(error.message);
    setDone(true);
    toast.success("Marcado como concluído!");
  };

  if (!t) return <div className="p-10 text-muted-foreground">Carregando…</div>;

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <Link to="/treinamentos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-black shadow-sm">
        <div className="aspect-video">
          <iframe
            src={getEmbedUrl(t.video_url)}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>

      <h1 className="mt-6 font-titulo text-3xl" style={{ color: "var(--brand-navy)" }}>{t.titulo}</h1>
      {t.descricao && <p className="mt-2 text-muted-foreground">{t.descricao}</p>}

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
