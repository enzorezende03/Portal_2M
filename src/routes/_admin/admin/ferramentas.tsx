import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/ferramentas")({
  component: FerramentasAdmin,
});

type Ferramenta = {
  id: string;
  nome: string;
  descricao: string | null;
  url_acesso: string;
  icone: string | null;
  ordem: number;
  ativo: boolean;
  abre_em_nova_aba: boolean;
  requer_sso: boolean;
};
type Empresa = { id: string; nome: string; slug: string };

function FerramentasAdmin() {
  const qc = useQueryClient();

  const { data: ferramentas = [], isLoading } = useQuery({
    queryKey: ["admin-ferramentas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ferramentas")
        .select("*")
        .order("ordem");
      if (error) throw error;
      return data as Ferramenta[];
    },
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ["admin-empresas-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("id,nome,slug").order("nome");
      if (error) throw error;
      return data as Empresa[];
    },
  });

  const { data: vinculos = {} } = useQuery({
    queryKey: ["admin-ferramentas-empresas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ferramentas_empresas").select("*");
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r: any) => {
        (map[r.ferramenta_id] ||= []).push(r.empresa_id);
      });
      return map;
    },
  });

  const [editing, setEditing] = useState<Ferramenta | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Ferramenta | null>(null);

  function openNew() {
    setEditing({
      id: "", nome: "", descricao: "", url_acesso: "", icone: "",
      ordem: 0, ativo: true, abre_em_nova_aba: true, requer_sso: false,
    });
    setOpen(true);
  }
  function openEdit(f: Ferramenta) {
    setEditing({ ...f });
    setOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("ferramentas").delete().eq("id", deleteTarget.id);
    if (error) return toast.error(error.message);
    toast.success("Ferramenta removida");
    setDeleteTarget(null);
    qc.invalidateQueries({ queryKey: ["admin-ferramentas"] });
    qc.invalidateQueries({ queryKey: ["admin-ferramentas-empresas"] });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-titulo text-2xl" style={{ color: "var(--brand-navy)" }}>Ferramentas</h2>
          <p className="text-sm text-muted-foreground">Gerencie os atalhos exibidos para os clientes.</p>
        </div>
        <Button onClick={openNew} style={{ background: "var(--brand-primary)" }}>
          <Plus className="h-4 w-4" /> Nova ferramenta
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Empresas</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-28 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Carregando…</TableCell></TableRow>
            )}
            {!isLoading && ferramentas.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhuma ferramenta cadastrada.</TableCell></TableRow>
            )}
            {ferramentas.map((f) => {
              const slugs = (vinculos[f.id] ?? [])
                .map((eid) => empresas.find((e) => e.id === eid)?.nome)
                .filter(Boolean);
              return (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{f.descricao || "—"}</TableCell>
                  <TableCell>
                    <a href={f.url_acesso} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm hover:underline" style={{ color: "var(--brand-primary)" }}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="max-w-[200px] truncate">{f.url_acesso}</span>
                    </a>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{slugs.join(", ") || "—"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${f.ativo ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                      {f.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(f)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <FerramentaDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        empresas={empresas}
        vinculosIniciais={editing ? vinculos[editing.id] ?? [] : []}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin-ferramentas"] });
          qc.invalidateQueries({ queryKey: ["admin-ferramentas-empresas"] });
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ferramenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A ferramenta <strong>{deleteTarget?.nome}</strong> será removida para todas as empresas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FerramentaDialog({
  open, onOpenChange, editing, empresas, vinculosIniciais, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Ferramenta | null;
  empresas: Empresa[];
  vinculosIniciais: string[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Ferramenta | null>(editing);
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>(vinculosIniciais);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editing);
    setSelectedEmpresas(vinculosIniciais);
  }, [editing, vinculosIniciais]);

  if (!form) return null;

  function toggleEmpresa(id: string) {
    setSelectedEmpresas((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function save() {
    if (!form) return;
    if (!form.nome.trim() || !form.url_acesso.trim()) {
      toast.error("Nome e URL são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao,
        url_acesso: form.url_acesso,
        icone: form.icone,
        ordem: form.ordem,
        ativo: form.ativo,
        abre_em_nova_aba: form.abre_em_nova_aba,
        requer_sso: form.requer_sso,
      };
      let id = form.id;
      if (id) {
        const { error } = await supabase.from("ferramentas").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("ferramentas").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      // Sync vínculos: delete all + insert selected
      await supabase.from("ferramentas_empresas").delete().eq("ferramenta_id", id);
      if (selectedEmpresas.length > 0) {
        const rows = selectedEmpresas.map((eid) => ({ ferramenta_id: id, empresa_id: eid }));
        const { error: e2 } = await supabase.from("ferramentas_empresas").insert(rows);
        if (e2) throw e2;
      }

      toast.success("Ferramenta salva");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar ferramenta" : "Nova ferramenta"}</DialogTitle>
          <DialogDescription>Preencha os dados e selecione as empresas que terão acesso.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Textarea rows={2} value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>URL de acesso *</Label>
            <Input type="url" placeholder="https://…" value={form.url_acesso} onChange={(e) => setForm({ ...form, url_acesso: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Ícone (lucide)</Label>
              <Input value={form.icone ?? ""} onChange={(e) => setForm({ ...form, icone: e.target.value })} placeholder="ex: external-link" />
            </div>
            <div className="grid gap-2">
              <Label>Ordem</Label>
              <Input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              Ativo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.abre_em_nova_aba} onCheckedChange={(v) => setForm({ ...form, abre_em_nova_aba: v })} />
              Abrir em nova aba
            </label>
            <label className="flex items-center gap-2 text-sm" title="Passa a sessão do usuário no fragment da URL para login automático no projeto Lovable">
              <Switch checked={form.requer_sso} onCheckedChange={(v) => setForm({ ...form, requer_sso: v })} />
              Login automático (SSO)
            </label>
          </div>


          <div className="grid gap-2">
            <Label>Empresas com acesso</Label>
            <div className="space-y-2 rounded-md border border-border p-3">
              {empresas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada.</p>}
              {empresas.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedEmpresas.includes(e.id)}
                    onCheckedChange={() => toggleEmpresa(e.id)}
                  />
                  {e.nome} <span className="text-muted-foreground">({e.slug})</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving} style={{ background: "var(--brand-primary)" }}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
