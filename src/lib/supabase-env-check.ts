// Checa se as variáveis VITE_SUPABASE_* estão presentes no bundle.
// Em deploys próprios (Vercel etc.) o usuário precisa configurá-las.
export function hasSupabaseEnv(): boolean {
  try {
    const url = (import.meta as any).env?.VITE_SUPABASE_URL;
    const key = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (url && key) return true;
    // Fallback: process.env injetado pelo SSR (Cloudflare Worker / Vercel)
    const w: any = typeof window !== "undefined" ? window : globalThis;
    const purl = w?.process?.env?.SUPABASE_URL || w?.process?.env?.VITE_SUPABASE_URL;
    const pkey = w?.process?.env?.SUPABASE_PUBLISHABLE_KEY || w?.process?.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
    return Boolean(purl && pkey);
  } catch {
    return false;
  }
}