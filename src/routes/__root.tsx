import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { hasSupabaseEnv } from "@/lib/supabase-env-check";
import { ThemeProvider } from "@/lib/theme";
import { HidScannerProvider } from "@/lib/hid-scanner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LyneCloud — Sistema Operacional Enterprise" },
      { name: "description", content: "Plataforma operacional premium para conveniências, distribuidoras, adegas e varejo." },
      { name: "author", content: "LyneCloud" },
      { property: "og:title", content: "LyneCloud — Sistema Operacional Enterprise" },
      { property: "og:description", content: "Plataforma operacional premium para conveniências, distribuidoras, adegas e varejo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "LyneCloud — Sistema Operacional Enterprise" },
      { name: "twitter:description", content: "Plataforma operacional premium para conveniências, distribuidoras, adegas e varejo." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0ba2060b-7a8f-48a3-b9fb-f64effd99d08/id-preview-98c16ae6--a418c780-fb32-4dce-8cc0-a1990adaa079.lovable.app-1779832100260.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0ba2060b-7a8f-48a3-b9fb-f64effd99d08/id-preview-98c16ae6--a418c780-fb32-4dce-8cc0-a1990adaa079.lovable.app-1779832100260.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  // Em produção (Cloudflare Worker / Vercel) as VITE_* podem não estar presentes
  // no build, mas process.env.SUPABASE_* existem no runtime do servidor.
  // Injetamos no window antes do bundle React rodar; o client.ts já tem
  // fallback para process.env, que vai encontrar esses valores.
  const envScript = (() => {
    try {
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
      const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
      if (!url || !key) return "";
      const payload = JSON.stringify({ SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key });
      return `window.process=window.process||{env:{}};Object.assign(window.process.env,${payload});`;
    } catch {
      return "";
    }
  })();
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {envScript ? (
          <script dangerouslySetInnerHTML={{ __html: envScript }} />
        ) : null}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  if (!hasSupabaseEnv()) {
    return <EnvMissingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <HidScannerProvider>
            <Outlet />
            <Toaster position="top-right" richColors />
          </HidScannerProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function EnvMissingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-xl rounded-lg border border-destructive/30 bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-destructive">Backend não configurado neste deploy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          As variáveis de ambiente do backend não estão presentes no build atual.
          No painel de hospedagem (ex.: Vercel) adicione as variáveis abaixo em
          <strong> Settings → Environment Variables</strong> (para Production e Preview)
          e refaça o deploy.
        </p>
        <ul className="mt-4 space-y-1.5 rounded-md border bg-muted/40 p-3 font-mono text-xs">
          <li><strong>VITE_SUPABASE_URL</strong></li>
          <li><strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong></li>
          <li><strong>VITE_SUPABASE_PROJECT_ID</strong></li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Os valores estão no arquivo <code className="font-mono">.env</code> deste projeto. Após salvar, clique em <em>Redeploy</em>.
        </p>
      </div>
    </div>
  );
}
