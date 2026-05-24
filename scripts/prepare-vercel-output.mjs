// Verifies the Vercel Build Output API directory exists after `vite build`
// with the Nitro `vercel` preset. Nitro writes `.vercel/output/` which Vercel
// picks up automatically — no copy step needed.
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(".vercel/output");
const cfg = resolve(".vercel/output/config.json");

if (!existsSync(dir) || !existsSync(cfg)) {
  console.error(
    "Vercel Build Output API directory not found at .vercel/output.\n" +
      "Expected Nitro (preset=vercel) to generate it during `vite build`.\n" +
      "Check that vite.vercel.config.ts includes nitro() and the build ran successfully.",
  );
  process.exit(1);
}

console.log("Vercel build output ready at .vercel/output (Build Output API).");
