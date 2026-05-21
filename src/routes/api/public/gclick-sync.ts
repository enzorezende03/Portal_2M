import { createFileRoute } from "@tanstack/react-router";
import { executarSincronizacao } from "@/lib/gclick-sync.functions";

// Endpoint para agendador externo (n8n, cron-job.org).
// Proteção: header X-Sync-Token deve bater com GCLICK_SYNC_TOKEN.
export const Route = createFileRoute("/api/public/gclick-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.GCLICK_SYNC_TOKEN;
        const token = request.headers.get("x-sync-token");
        if (!expected || token !== expected) {
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
