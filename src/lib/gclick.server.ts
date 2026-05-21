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

  const clientId = process.env.GCLICK_CLIENT_ID;
  const clientSecret = process.env.GCLICK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GCLICK_CLIENT_ID/GCLICK_CLIENT_SECRET não configurados");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`G-Click auth falhou [${res.status}]: ${txt}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

export async function gclickFetch<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
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
  cliente?: {
    id?: string | number;
    nome?: string;
    inscricao?: string;
    cnpj?: string;
  };
  // outros campos arbitrários
  [k: string]: any;
};

export type GclickAtividade = {
  id: string | number;
  nome?: string;
  status?: string;
  concluido?: boolean;
  anexo?: { url?: string; nome?: string; mimeType?: string } | null;
  anexoUrl?: string;
  arquivoUrl?: string;
  [k: string]: any;
};

export async function listarTarefasGclick(params: {
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;
  size?: number;
  page?: number;
}): Promise<GclickTarefa[]> {
  const qs = new URLSearchParams();
  if (params.dataInicio) qs.set("dataInicio", params.dataInicio);
  if (params.dataFim) qs.set("dataFim", params.dataFim);
  qs.set("size", String(params.size ?? 100));
  qs.set("page", String(params.page ?? 0));

  const data = await gclickFetch<any>(`/tarefas?${qs.toString()}`);
  // A API costuma retornar { content: [...] } ou array direto
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

export function extrairAnexoUrl(a: GclickAtividade): string | null {
  return a.anexo?.url ?? a.anexoUrl ?? a.arquivoUrl ?? null;
}

export async function baixarAnexo(url: string): Promise<{
  bytes: Uint8Array;
  contentType: string;
  nomeSugerido: string;
}> {
  // Anexos do G-Click podem exigir o mesmo bearer; tentamos primeiro com auth.
  const token = await getAccessToken();
  const tryFetch = async (withAuth: boolean) =>
    fetch(url, withAuth ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  let res = await tryFetch(true);
  if (!res.ok && (res.status === 401 || res.status === 403)) {
    res = await tryFetch(false);
  }
  if (!res.ok) throw new Error(`Falha ao baixar anexo [${res.status}]`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const ct = res.headers.get("content-type") ?? "application/pdf";
  const cd = res.headers.get("content-disposition") ?? "";
  const m = /filename\*?=(?:UTF-8'')?\"?([^\";]+)\"?/i.exec(cd);
  const nome = m?.[1] ? decodeURIComponent(m[1]) : url.split("/").pop()?.split("?")[0] ?? "anexo.pdf";
  return { bytes: buf, contentType: ct, nomeSugerido: nome };
}

export function onlyDigits(s?: string | null): string {
  return (s ?? "").replace(/\D+/g, "");
}
