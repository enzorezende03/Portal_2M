import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { impersonateUser } from "./impersonate.functions";

const ADMIN_KEY = "impersonation_admin_session";
const ACTIVE_KEY = "impersonation_active";

type SavedSession = { access_token: string; refresh_token: string; admin_user_id: string };
type ActiveState = {
  targetUserId: string;
  targetEmail: string;
  targetNome?: string | null;
  startedAt: number;
};

export function getActiveImpersonation(): ActiveState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as ActiveState) : null;
  } catch {
    return null;
  }
}

export async function startImpersonation(targetUserId: string, targetNome?: string | null) {
  // 1. Guardar sessão atual do admin
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("Sessão expirada. Faça login novamente.");
  const saved: SavedSession = {
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    admin_user_id: sessionData.session.user.id,
  };
  localStorage.setItem(ADMIN_KEY, JSON.stringify(saved));

  try {
    // 2. Pedir token de acesso do usuário alvo
    const result = await impersonateUser({ data: { targetUserId } });

    // 3. Trocar sessão localmente
    const { error } = await supabase.auth.verifyOtp({
      token_hash: result.tokenHash,
      type: "magiclink",
    });
    if (error) throw error;

    // 4. Marcar estado ativo
    const active: ActiveState = {
      targetUserId: result.targetUserId,
      targetEmail: result.email,
      targetNome: targetNome ?? null,
      startedAt: Date.now(),
    };
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));

    // 5. Forçar reload no /
    window.location.href = "/";
  } catch (e) {
    localStorage.removeItem(ADMIN_KEY);
    throw e;
  }
}

export async function stopImpersonation() {
  const raw = localStorage.getItem(ADMIN_KEY);
  localStorage.removeItem(ACTIVE_KEY);
  localStorage.removeItem(ADMIN_KEY);

  if (raw) {
    try {
      const saved = JSON.parse(raw) as SavedSession;
      await supabase.auth.setSession({
        access_token: saved.access_token,
        refresh_token: saved.refresh_token,
      });
      window.location.href = "/admin/clientes";
      return;
    } catch {
      // se falhar (token expirado), cai para signOut + login
    }
  }
  await supabase.auth.signOut();
  window.location.href = "/login";
}

export function useImpersonation() {
  const [active, setActive] = useState<ActiveState | null>(() => getActiveImpersonation());
  useEffect(() => {
    const sync = () => setActive(getActiveImpersonation());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return active;
}
