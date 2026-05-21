// Cliente HTTP autenticado para a API do Omie.G-Click.
// Server-only: nunca importar em código de cliente.

const BASE_URL = "https://api.gclick.com.br";

type TokenCache = {
  token: string;
  expiresAt: number;
};

let cached: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const clientId = process.env.GCLICK_CLIENT_ID?.trim();
  const clientSecret = process.env.GCLICK_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("GCLICK_CLIENT_ID/GCLICK_CLIENT_SECRET não configurados");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  // Documentação oficial do Omie.G-Click: POST /oauth/token com form-urlencoded.
  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("G-Click auth falhou", { status: res.status, body: txt.slice(0, 300) });
    if (res.status === 401 || txt.includes("invalid_client")) {
      throw new Error(
        "Credenciais do G-Click inválidas. Atualize o Client ID e Client Secret da integração.",
      );
    }
    if (res.status >= 500) {
      throw new Error(
        "O G-Click retornou erro interno ao autenticar. Tente novamente em alguns minutos.",
      );
    }
    throw new Error(`Falha ao autenticar no G-Click (${res.status}).`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    token?: string;
    expires_in?: number;
  };
  const token = data.access_token ?? data.token;
  if (!token) {
    throw new Error("G-Click auth: resposta sem token");
  }
  cached = {
    token,
    // Token do G-Click costuma durar 24h; usamos expires_in se vier, senão 23h.
    expiresAt: Date.now() + (data.expires_in ?? 23 * 3600) * 1000,
  };
  return cached.token;
}

export async function gclickFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`G-Click ${path} [${res.status}]: ${txt.slice(0, 300)}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

// Tipos defensivos — a API do G-Click evolui; usamos `any` no envelope
// e extraímos os campos conhecidos.
export type GclickTarefa = {
  id: string | number;
  nome?: string;
  competencia?: string;
  vencimento?: string;
  dataVencimento?: string;
  clienteId?: string | number;
  clienteInscricao?: string;
  clienteApelido?: string;
  clienteNome?: string;
  clienteEmail?: string;
  cliente?: {
    id?: string | number;
    nome?: string;
    apelido?: string;
    email?: string;
    inscricao?: string;
    cnpj?: string;
  };
  // outros campos arbitrários
  [k: string]: any;
};

export type GclickArquivo = { nome?: string; url?: string; mimeType?: string };

export type GclickAtividade = {
  id: string | number;
  nome?: string;
  status?: string;
  concluido?: boolean;
  respondida?: boolean;
  respondidaEm?: string;
  arquivos?: GclickArquivo[];
  anexo?: { url?: string; nome?: string; mimeType?: string } | null;
  anexoUrl?: string;
  arquivoUrl?: string;
  [k: string]: any;
};

export type GclickCategoria = "Obrigacao" | "Solicitacao" | "Cobranca" | "CertificadoDigital";

export async function listarTarefasGclick(params: {
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;
  size?: number;
  page?: number;
  categoria: GclickCategoria;
}): Promise<GclickTarefa[]> {
  const qs = new URLSearchParams();
  qs.set("categoria", params.categoria);
  if (params.dataInicio) qs.set("dataAcaoInicio", params.dataInicio);
  if (params.dataFim) qs.set("dataAcaoFim", params.dataFim);
  qs.set("size", String(params.size ?? 100));
  qs.set("page", String(params.page ?? 0));

  const data = await gclickFetch<any>(`/tarefas?${qs.toString()}`);
  if (Array.isArray(data)) return data as GclickTarefa[];
  if (Array.isArray(data?.content)) return data.content as GclickTarefa[];
  if (Array.isArray(data?.data)) return data.data as GclickTarefa[];
  return [];
}

export async function listarAtividadesPorTarefa(
  tarefaId: string | number,
): Promise<GclickAtividade[]> {
  const data = await gclickFetch<any>(`/tarefas/${tarefaId}/atividades`);
  if (Array.isArray(data)) return data as GclickAtividade[];
  if (Array.isArray(data?.content)) return data.content as GclickAtividade[];
  if (Array.isArray(data?.data)) return data.data as GclickAtividade[];
  return [];
}

export function extrairAnexo(a: GclickAtividade): GclickArquivo | null {
  if (Array.isArray(a.arquivos)) {
    const f = a.arquivos.find((x) => x?.url);
    if (f?.url) return f;
  }
  if (a.anexo?.url) return a.anexo;
  if (a.anexoUrl) return { url: a.anexoUrl };
  if (a.arquivoUrl) return { url: a.arquivoUrl };
  return null;
}

export function extrairAnexoUrl(a: GclickAtividade): string | null {
  return extrairAnexo(a)?.url ?? null;
}

export async function baixarAnexo(url: string): Promise<{
  bytes: Uint8Array;
  contentType: string;
  nomeSugerido: string;
}> {
  // Alguns anexos vêm com URL assinada e falham com Bearer (400); outros exigem auth.
  // Por isso tentamos primeiro o link direto e depois com autenticação.
  const token = await getAccessToken();
  const tryFetch = async (withAuth: boolean) =>
    fetch(url, withAuth ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  let res = await tryFetch(false);
  if (!res.ok) res = await tryFetch(true);
  if (!res.ok && res.status === 400) res = await tryFetch(false);
  if (!res.ok) throw new Error(`Falha ao baixar anexo [${res.status}]`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const ct = res.headers.get("content-type") ?? "application/pdf";
  const cd = res.headers.get("content-disposition") ?? "";
  const m = /filename\*?=(?:UTF-8'')?\"?([^\";]+)\"?/i.exec(cd);
  const nome = m?.[1]
    ? decodeURIComponent(m[1])
    : (url.split("/").pop()?.split("?")[0] ?? "anexo.pdf");
  return { bytes: buf, contentType: ct, nomeSugerido: nome };
}

export function onlyDigits(s?: string | null): string {
  return String(s ?? "").replace(/\D+/g, "");
}
