import { createFileRoute } from "@tanstack/react-router";
import { executarSincronizacao } from "@/lib/gclick-sync.functions";

// Endpoint chamado pelo pg_cron (Supabase) ou agendador externo.
// Proteção: header `apikey` deve ser a chave anon/publishable do projeto
// OU header `x-sync-token` deve bater com GCLICK_SYNC_TOKEN (compat).
export const Route = createFileRoute("/api/public/gclick-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
        const expectedToken = process.env.GCLICK_SYNC_TOKEN;
        const apikey = request.headers.get("apikey");
        const token = request.headers.get("x-sync-token");
        const okApikey = !!anon && apikey === anon;
        const okToken = !!expectedToken && token === expectedToken;
        if (!okApikey && !okToken) {
          return new Response("Unauthorized", { status: 401 });
        }
        const url = new URL(request.url);
        const dias = Math.max(
          1,
          Math.min(180, Number(url.searchParams.get("dias")) || 7),
        );
        try {
          const result = await executarSincronizacao({ diasAtras: dias });
          return Response.json({ ok: true, ...result });
        } catch (e: any) {
          return Response.json(
            { ok: false, error: e?.message ?? "erro" },
            { status: 500 },
          );
        }
      },
    },
  },
});
