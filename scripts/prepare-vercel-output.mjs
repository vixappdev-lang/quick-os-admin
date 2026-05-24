import { existsSync, rmSync, cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const candidates = ["dist/client", ".output/public", "dist/public", "dist"];
const source = candidates.find((dir) => existsSync(join(dir, "index.html")));

if (!source) {
  throw new Error(`Vercel output not found. Checked: ${candidates.join(", ")}`);
}

rmSync("public", { recursive: true, force: true });
mkdirSync("public", { recursive: true });
cpSync(source, "public", { recursive: true });
writeFileSync("public/.vercel-output-source", `${source}\n`);
console.log(`Prepared Vercel static output from ${source} -> public`);
