// Vercel-specific build config. Uses Nitro (preset=vercel) instead of the
// Cloudflare Worker build that powers Lovable Cloud. Triggered via
// `bun run build:vercel`.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    // Use the standard TanStack server entry on Vercel (not our Worker wrapper).
    server: { entry: undefined },
  },
  plugins: [nitro()],
});