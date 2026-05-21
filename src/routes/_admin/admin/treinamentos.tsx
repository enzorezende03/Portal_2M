import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, Pencil, Upload, FileText, Film, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/treinamentos")({
  component: TreinamentosAdmin,
});

type Categoria = { id: string; nome: string };
type Treinamento = {
  id: string;
  titulo: string;
  descricao: string | null;
  video_url: string;
  pdf_url: string | null;
  thumbnail_url: string | null;
  categoria_id: string | null;
  duracao_segundos: number | null;
  ordem: number;
  ativo: boolean;
};

function fmtDur(s?: number | null) {
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function TreinamentosAdmin() {
  const [rows, setRows] = useState<Treinamento[]>([]);
  const [cats, setCats] = useState<Categoria[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Treinamento | null>(null);

  const load = async () => {
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from("treinamentos").select("*").order("ordem"),
      supabase.from("categorias_treinamento").select("id,nome").order("ordem"),
    ]);
    setRows((t as Treinamento[]) ?? []);
    setCats((c as Categoria[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) =>
    !q ? true : [r.titulo, r.descricao].some((v) => String(v ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  const catNome = (id: string | null) => (id ? cats.find((c) => c.id === id)?.nome ?? "—" : "—");

  const remover = async (r: Treinamento) => {
    if (!confirm(`Remover "${r.titulo}"?`)) return;
    const { error } = await supabase.from("treinamentos").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Treinamento removido");
    load();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>
            Treinamentos
          </h2>
          <p className="text-sm text-muted-foreground">{filtered.length} de {rows.length} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2"
            style={{ ["--tw-ring-color" as any]: "var(--brand-primary)" }}
          />
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white"
            style={{ background: "var(--brand-primary)" }}
          >
            <Plus className="h-4 w-4" /> Novo treinamento
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Duração</th>
              <th className="px-4 py-3 font-medium">Arquivos</th>
              <th className="px-4 py-3 font-medium">Ativo</th>
              <th className="px-4 py-3 font-medium w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.titulo}</div>
                  {r.descricao && <div className="line-clamp-1 text-xs text-muted-foreground">{r.descricao}</div>}
                </td>
                <td className="px-4 py-3">{catNome(r.categoria_id)}</td>
                <td className="px-4 py-3">{fmtDur(r.duracao_segundos)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {r.video_url && <Film className="h-4 w-4 text-muted-foreground" />}
                    {r.pdf_url && <FileText className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </td>
                <td className="px-4 py-3">{r.ativo ? "Sim" : "Não"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditing(r)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remover(r)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum treinamento ainda. Clique em "Novo treinamento" para começar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <TreinamentoDialog
          categorias={cats}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            load();
          }}
        />
      )}
      {editing && (
        <TreinamentoDialog
          categorias={cats}
          treinamento={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function TreinamentoDialog({
  categorias,
  treinamento,
  onClose,
  onSaved,
}: {
  categorias: Categoria[];
  treinamento?: Treinamento;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editMode = !!treinamento;
  const [titulo, setTitulo] = useState(treinamento?.titulo ?? "");
  const [descricao, setDescricao] = useState(treinamento?.descricao ?? "");
  const [categoriaId, setCategoriaId] = useState(treinamento?.categoria_id ?? "");
  const [ativo, setAtivo] = useState(treinamento?.ativo ?? true);
  const [videoUrl, setVideoUrl] = useState(treinamento?.video_url ?? "");
  const [pdfUrl, setPdfUrl] = useState(treinamento?.pdf_url ?? "");
  const [duracao, setDuracao] = useState<string>(treinamento?.duracao_segundos?.toString() ?? "");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const detectDuration = (file: File) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.onloadedmetadata = () => {
      if (!isNaN(video.duration)) {
        setDuracao(Math.round(video.duration).toString());
      }
      URL.revokeObjectURL(url);
    };
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return toast.error("Informe o título");
    if (!videoFile && !videoUrl.trim()) return toast.error("Envie um vídeo ou cole uma URL");

    setSaving(true);
    try {
      let finalVideoUrl = videoUrl.trim();
      let finalPdfUrl = pdfUrl.trim();

      if (videoFile) {
        setUploadProgress("Enviando vídeo…");
        const ext = videoFile.name.split(".").pop() || "mp4";
        const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("treinamentos-videos")
          .upload(path, videoFile, { contentType: videoFile.type, upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("treinamentos-videos").getPublicUrl(path);
        finalVideoUrl = data.publicUrl;
      }

      if (pdfFile) {
        setUploadProgress("Enviando PDF…");
        const path = `${Date.now()}-${crypto.randomUUID()}.pdf`;
        const { error } = await supabase.storage
          .from("treinamentos-pdfs")
          .upload(path, pdfFile, { contentType: "application/pdf", upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("treinamentos-pdfs").getPublicUrl(path);
        finalPdfUrl = data.publicUrl;
      }

      setUploadProgress("Salvando…");
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        categoria_id: categoriaId || null,
        video_url: finalVideoUrl,
        pdf_url: finalPdfUrl || null,
        duracao_segundos: duracao ? Number(duracao) : null,
        ativo,
      };

      if (editMode) {
        const { error } = await supabase.from("treinamentos").update(payload).eq("id", treinamento!.id);
        if (error) throw error;
        toast.success("Treinamento atualizado");
      } else {
        const { data: inserted, error } = await supabase
          .from("treinamentos")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;

        // Liga a todas as empresas para ficar visível pelos clientes
        const { data: empresas } = await supabase.from("empresas").select("id");
        if (empresas && empresas.length > 0 && inserted) {
          await supabase.from("treinamentos_empresas").insert(
            empresas.map((e: any) => ({ treinamento_id: inserted.id, empresa_id: e.id })),
          );
        }
        toast.success("Treinamento criado");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
      setUploadProgress("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-titulo text-xl" style={{ color: "var(--brand-navy)" }}>
            {editMode ? "Editar treinamento" : "Novo treinamento"}
          </h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Título *</span>
            <input
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Como emitir uma nota fiscal"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Descrição</span>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Descreva o que o cliente vai aprender neste vídeo…"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">Categoria</span>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
              >
                <option value="">— Sem categoria —</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Duração (segundos)</span>
              <input
                type="number"
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
                placeholder="Detectada automaticamente"
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
              />
            </label>
          </div>

          {/* Upload de vídeo */}
          <div className="rounded-xl border border-dashed border-border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Film className="h-4 w-4" /> Vídeo *
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-6 text-sm hover:bg-muted">
              <Upload className="h-4 w-4" />
              {videoFile ? videoFile.name : "Clique para selecionar o arquivo de vídeo"}
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setVideoFile(f);
                  if (f) detectDuration(f);
                }}
              />
            </label>
            <div className="mt-2 text-xs text-muted-foreground">
              Ou cole uma URL existente (YouTube, Vimeo, Bunny, etc.):
            </div>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </div>

          {/* Upload de PDF */}
          <div className="rounded-xl border border-dashed border-border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" /> Material em PDF (opcional)
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-6 text-sm hover:bg-muted">
              <Upload className="h-4 w-4" />
              {pdfFile ? pdfFile.name : pdfUrl ? "Substituir PDF atual" : "Clique para anexar um PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {pdfUrl && !pdfFile && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                  Ver PDF atual
                </a>
                <button type="button" onClick={() => setPdfUrl("")} className="text-destructive">
                  Remover
                </button>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span className="text-sm">Ativo (visível para os clientes)</span>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{uploadProgress}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: "var(--brand-primary)" }}
            >
              {saving ? "Salvando…" : editMode ? "Salvar" : "Publicar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
