import { createSsoToken } from "@/lib/sso.functions";

/**
 * Constrói URL apontando para /api/public/sso?token=... no app filho.
 * O app filho valida a assinatura HMAC, cria/loga o usuário e redireciona.
 */
export async function buildSsoUrl(baseUrl: string): Promise<string> {
  try {
    const { token } = await createSsoToken();
    const url = new URL(baseUrl);
    const callback = `${url.origin}/api/public/sso`;
    const redirect = url.pathname + url.search + url.hash;
    return `${callback}?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirect || "/")}`;
  } catch (error) {
    console.warn("Falha ao gerar token SSO; abrindo URL original.", error);
    return baseUrl;
  }
}

/** Abre a URL externa com token de SSO em nova aba. */
export async function openWithSso(baseUrl: string, newTab = true): Promise<void> {
  const url = await buildSsoUrl(baseUrl);
  if (newTab) {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = url;
  } else {
    window.location.href = url;
  }
}
