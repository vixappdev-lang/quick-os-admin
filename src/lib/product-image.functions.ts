import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ nome: z.string().min(2).max(120) }).parse(i))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");
    const prompt = `Foto profissional de produto: ${data.nome}. Fundo branco neutro, iluminação suave, embalagem brasileira realista, alto detalhe, sem texto adicional, estilo catálogo de mercado/conveniência.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI gateway: ${res.status} ${t.slice(0, 200)}`);
    }
    const json: any = await res.json();
    const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) throw new Error("Imagem não retornada pelo modelo");
    // Persiste na galeria reutilizável (best-effort, não bloqueia o retorno)
    try {
      const slug = data.nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      await context.supabase.from("product_images" as any).insert({
        nome: data.nome,
        nome_chave: slug,
        url,
        created_by: context.userId,
      });
    } catch { /* ignore */ }
    return { imageUrl: url as string };
  });

/**
 * Gera imagens com IA para todos os produtos que ainda não têm `imagem_url`.
 * Processa em série (limite 12 por chamada) para evitar timeouts.
 */
export const generateMissingProductImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const { data: pendentes } = await context.supabase
      .from("produtos")
      .select("id, nome")
      .or("imagem_url.is.null,imagem_url.eq.")
      .limit(12);

    if (!pendentes || pendentes.length === 0) return { processed: 0, total: 0 };

    let processed = 0;
    const erros: string[] = [];

    for (const p of pendentes) {
      try {
        const prompt = `Foto profissional de produto: ${p.nome}. Fundo branco neutro, iluminação suave, embalagem brasileira realista, alto detalhe, sem texto adicional, estilo catálogo de mercado/conveniência.`;
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });
        if (!res.ok) { erros.push(`${p.nome}: ${res.status}`); continue; }
        const json: any = await res.json();
        const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!url) { erros.push(`${p.nome}: sem URL`); continue; }

        await context.supabase.from("produtos").update({ imagem_url: url }).eq("id", p.id);
        const slug = p.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        await context.supabase.from("product_images" as any).insert({
          nome: p.nome, nome_chave: slug, url, created_by: context.userId,
        });
        processed++;
      } catch (e: any) {
        erros.push(`${p.nome}: ${e.message ?? "erro"}`);
      }
    }
    return { processed, total: pendentes.length, erros };
  });