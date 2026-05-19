import { supabase } from "@/integrations/supabase/client";

/**
 * Constrói uma URL com o token de SSO no fragment (#sso=...).
 * O projeto-filho lê o hash, chama supabase.auth.setSession() e o usuário
 * entra logado automaticamente. Tokens em fragment NÃO são enviados ao servidor.
 *
 * Pré-requisito: projeto-filho usa o mesmo VITE_SUPABASE_URL/KEY que o portal.
 */
export async function buildSsoUrl(baseUrl: string): Promise<string> {
  const { data: { session: initialSession } } = await supabase.auth.getSession();
  let session = initialSession;

  // Se expirado ou perto de expirar, tenta renovar
  if (session?.expires_at && session.expires_at * 1000 - Date.now() < 60_000) {
    try {
      const { data } = await supabase.auth.refreshSession();
      if (data.session) session = data.session;
    } catch (error) {
      console.warn("Não foi possível renovar a sessão antes do SSO; usando a sessão atual.", error);
    }
  }

  if (!session?.access_token || !session?.refresh_token) {
    // sem sessão, abre URL crua
    return baseUrl;
  }

  const payload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
  };

  // base64url-safe
  const b64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sep = baseUrl.includes("#") ? "&" : "#";
  return `${baseUrl}${sep}sso=${b64}`;
}

/** Abre a URL externa com token de SSO em nova aba. */
export async function openWithSso(baseUrl: string, newTab = true): Promise<void> {
  const url = await buildSsoUrl(baseUrl).catch((error) => {
    console.warn("Não foi possível gerar URL com SSO; abrindo link original.", error);
    return baseUrl;
  });
  if (newTab) {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      // popup bloqueado — fallback navegando na aba atual
      window.location.href = url;
    }
  } else {
    window.location.href = url;
  }
}
