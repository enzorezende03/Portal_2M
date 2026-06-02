import { Eye, LogOut } from "lucide-react";
import { useImpersonation, stopImpersonation } from "@/lib/impersonation";
import { useState } from "react";

export function ImpersonationBanner() {
  const active = useImpersonation();
  const [exiting, setExiting] = useState(false);
  if (!active) return null;

  const sair = async () => {
    setExiting(true);
    try {
      await stopImpersonation();
    } finally {
      setExiting(false);
    }
  };

  return (
    <div
      className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm shadow-sm"
      style={{
        background: "color-mix(in oklab, var(--brand-navy) 92%, black 8%)",
        color: "white",
        borderColor: "color-mix(in oklab, var(--brand-navy) 70%, black 30%)",
      }}
    >
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span>
          Você está visualizando como{" "}
          <strong>{active.targetNome || active.targetEmail}</strong>
        </span>
      </div>
      <button
        onClick={sair}
        disabled={exiting}
        className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1 text-xs font-medium hover:bg-white/25 disabled:opacity-60"
      >
        <LogOut className="h-3.5 w-3.5" />
        {exiting ? "Saindo…" : "Sair do modo visualização"}
      </button>
    </div>
  );
}
