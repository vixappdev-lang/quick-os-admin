// Checa se as variáveis VITE_SUPABASE_* estão presentes no bundle.
// Em deploys próprios (Vercel etc.) o usuário precisa configurá-las.
export function hasSupabaseEnv(): boolean {
  try {
    const url = (import.meta as any).env?.VITE_SUPABASE_URL;
    const key = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
    return Boolean(url && key);
  } catch {
    return false;
  }
}