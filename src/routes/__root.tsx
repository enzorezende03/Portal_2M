import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { BrandProvider } from "@/lib/brand";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-titulo text-7xl" style={{ color: "var(--brand-navy)" }}>404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--brand-primary)" }}
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Portal 2M" },
      { name: "description", content: "Central do cliente 2M Saúde e 2M Contabilidade" },
      { property: "og:title", content: "Portal 2M" },
      { name: "twitter:title", content: "Portal 2M" },
      { property: "og:description", content: "Central do cliente 2M Saúde e 2M Contabilidade" },
      { name: "twitter:description", content: "Central do cliente 2M Saúde e 2M Contabilidade" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/78363763-ce9d-49de-aad3-baf582e1c467/id-preview-0a9802c4--6f467a57-4592-43d4-9b49-5cbed61031df.lovable.app-1779388697496.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/78363763-ce9d-49de-aad3-baf582e1c467/id-preview-0a9802c4--6f467a57-4592-43d4-9b49-5cbed61031df.lovable.app-1779388697496.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider>
        <AuthProvider>
          <ImpersonationBanner />
          <Outlet />
          <Toaster />
        </AuthProvider>
      </BrandProvider>
    </QueryClientProvider>
  );
}
