// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
//
// Also: garantir que o bundle do browser tenha as URLs/chaves do Supabase
// embutidas mesmo quando o pipeline de build não exporta VITE_* (acontece em
// alguns publishes), copiando dos secrets SUPABASE_* disponíveis no build.
// E manter `process.env.SUPABASE_*` como acesso dinâmico no browser para que
// a injeção SSR feita em __root.tsx (window.process.env) siga funcionando —
// sem isso, plugins podem reescrever estaticamente para `undefined`.
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      // Build-time injection: garante que `import.meta.env.VITE_SUPABASE_*`
      // resolva para strings reais no bundle publicado, mesmo se o pipeline
      // só expuser os SUPABASE_* (sem prefixo VITE_).
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        SUPABASE_PUBLISHABLE_KEY,
      ),
      // Also inline process.env.SUPABASE_* as string literals so any
      // browser-side fallback resolves at build time. esbuild's `define`
      // requires a JS literal — expressions are rejected.
      "process.env.SUPABASE_URL": JSON.stringify(SUPABASE_URL),
      "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        SUPABASE_PUBLISHABLE_KEY,
      ),
    },
  },
});
