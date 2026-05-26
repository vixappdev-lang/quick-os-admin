// Vercel-specific build config. Uses Nitro (preset=vercel) instead of the
// Cloudflare Worker build that powers Lovable Cloud. Triggered via
// `bun run build:vercel`.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// Mesmos fallbacks do vite.config.ts — garantem que o build na Vercel
// (que não tem as VITE_SUPABASE_* nem as SUPABASE_* exportadas por padrão)
// tenha as chaves públicas embutidas no bundle do servidor e do cliente.
// Service role NUNCA é embutida aqui; precisa ser configurada como secret
// na Vercel (Settings → Environment Variables → SUPABASE_SERVICE_ROLE_KEY).
const FALLBACK_SUPABASE_URL = "https://rbquvltcxdqmbcftxswa.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJicXV2bHRjeGRxbWJjZnR4c3dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzkxMTYsImV4cCI6MjA5NTE1NTExNn0.NUVwh909T_F_eFa6i0-zJ_MGXKh1KpYaW5oKnD3c-S0";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  FALLBACK_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  FALLBACK_SUPABASE_PUBLISHABLE_KEY;

const defines: Record<string, string> = {
  "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(SUPABASE_URL),
  "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(SUPABASE_PUBLISHABLE_KEY),
  "process.env.SUPABASE_URL": JSON.stringify(SUPABASE_URL),
  "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(SUPABASE_PUBLISHABLE_KEY),
};

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    // Use the standard TanStack server entry on Vercel (not our Worker wrapper).
    server: { entry: undefined },
  },
  plugins: [nitro()],
  vite: {
    define: defines,
  },
});