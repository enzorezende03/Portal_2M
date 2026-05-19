import { createSsoToken } from "@/lib/sso.functions";

/**
 * Constrói URL apontando para /api/public/sso?token=... no app filho.
 * O app filho valida a assinatura HMAC, cria/loga o usuário e redireciona.
 */
export async function buildSsoUrl(baseUrl: string): Promise<string> {
  const url = new URL(baseUrl);
  const redirect = url.pathname + url.search + url.hash;
  // Mapeia host do app -> URL da edge function SSO correspondente
  const ssoEndpoints: Record<string, string> = {
    "ref-tributaria.lovable.app":
      "https://uhhsvijsoyqkgimeokau.supabase.co/functions/v1/sso",
  };
  const endpoint = ssoEndpoints[url.host];
  if (!endpoint) return baseUrl; // app sem SSO configurado

  const { token } = await createSsoToken();
  if (!token) throw new Error("Token SSO não foi gerado");
  return `${endpoint}?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirect || "/")}`;
}

/** Abre a URL externa com token de SSO em nova aba. */
export async function openWithSso(baseUrl: string, newTab = true): Promise<void> {
  const win = newTab ? window.open("about:blank", "_blank") : null;
  if (win) {
    win.opener = null;
    win.document.title = "Entrando...";
    win.document.body.innerHTML = "<p style='font-family: system-ui; padding: 24px'>Entrando automaticamente...</p>";
  }

  try {
    const url = await buildSsoUrl(baseUrl);
    if (newTab) {
      if (win) win.location.href = url;
      else window.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch (error) {
    if (win) win.close();
    console.error("Falha ao abrir SSO", error);
    window.alert("Não foi possível iniciar o login automático. Tente novamente em instantes.");
  }
}
