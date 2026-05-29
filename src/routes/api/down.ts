import { createFileRoute } from "@tanstack/react-router";
import { zipSync, strToU8 } from "fflate";

// Bundle every text-ish source file at build time so the worker can serve
// the zip without filesystem access.
const textFiles = import.meta.glob(
  [
    "/src/**/*",
    "/public/**/*",
    "/supabase/**/*",
    "/scripts/**/*",
    "/docs/**/*",
    "/*.{json,js,ts,mjs,cjs,md,html,toml,jsonc,yml,yaml,lock}",
    "/.prettierrc",
    "/.prettierignore",
    "/.gitignore",
    "/.env.example",
    "/bunfig.toml",
    "/components.json",
    "/wrangler.jsonc",
    "/vercel.json",
    "/eslint.config.js",
    "/tsconfig.json",
    "/package.json",
    "/vite.config.ts",
    "/vite.vercel.config.ts",
  ],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

export const Route = createFileRoute("/api/down")({
  server: {
    handlers: {
      GET: async () => {
        const entries: Record<string, Uint8Array> = {};
        for (const [path, content] of Object.entries(textFiles)) {
          // path is like "/src/routes/index.tsx"; strip leading slash
          const rel = path.replace(/^\/+/, "");
          if (!rel) continue;
          try {
            entries[rel] = strToU8(typeof content === "string" ? content : String(content));
          } catch {
            // skip unreadable
          }
        }
        const zipped = zipSync(entries, { level: 6 });
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        // Copy into a fresh ArrayBuffer to satisfy BodyInit typing on workerd
        const body = new Uint8Array(zipped);
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="projeto-${ts}.zip"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});