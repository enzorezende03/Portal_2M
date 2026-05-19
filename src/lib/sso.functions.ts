import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { b64url } from "@/lib/sso.server";

/**
 * Gera um token SSO assinado (HMAC-SHA256) com o segredo compartilhado.
 * Formato: base64url(payload).base64url(signature)
 * Payload: { email, name, iat, exp }  — válido por 60s
 */
export const createSsoToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const secret = process.env.SSO_SHARED_SECRET;
    if (!secret) throw new Error("SSO_SHARED_SECRET não configurado");

    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, nome")
      .eq("id", userId)
      .maybeSingle();

    const email = profile?.email ?? context.claims?.email;
    if (!email) throw new Error("Usuário sem email");

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      email,
      name: profile?.nome ?? null,
      iat: now,
      exp: now + 60,
    };

    const payloadB64 = b64url(JSON.stringify(payload));
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payloadB64),
    );

    return { token: `${payloadB64}.${b64url(sig)}` };
  });
