import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export const DEFAULT_CLIENTE_PASSWORD = "2m_Brand";

const schema = z.object({
  email: z.string().email().max(255),
  nome: z.string().min(1).max(255),
  empresa_id: z.string().uuid().nullable().optional(),
  cnpj: z.string().max(32).nullable().optional(),
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: roles } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  if (!roles?.some((r: any) => r.role === "admin")) {
    throw new Error("Apenas administradores podem executar esta ação");
  }
}

async function createOne(
  email: string,
  nome: string,
  empresa_id?: string | null,
  cnpj?: string | null,
) {
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: DEFAULT_CLIENTE_PASSWORD,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error || !created.user) {
    throw new Error(error?.message ?? "Falha ao criar usuário");
  }
  await supabaseAdmin
    .from("profiles")
    .update({
      must_reset_password: true,
      ...(empresa_id ? { empresa_id } : {}),
      ...(cnpj ? { cnpj } : {}),
    })
    .eq("id", created.user.id);
  return created.user;
}


export const createClienteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const user = await createOne(data.email, data.nome, data.empresa_id ?? null);
    return { id: user.id, email: user.email };
  });

const bulkSchema = z.object({
  items: z
    .array(
      z.object({
        email: z.string().email().max(255),
        nome: z.string().min(1).max(255),
      }),
    )
    .min(1)
    .max(200),
});

export const bulkCreateClientes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => bulkSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const results: {
      email: string;
      status: "created" | "exists" | "error";
      message?: string;
    }[] = [];

    for (const item of data.items) {
      const email = item.email.trim().toLowerCase();
      try {
        await createOne(email, item.nome);
        results.push({ email, status: "created" });
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        if (/already|exist|registered|duplicate/i.test(msg)) {
          results.push({ email, status: "exists", message: msg });
        } else {
          results.push({ email, status: "error", message: msg });
        }
      }
    }

    return { results };
  });
