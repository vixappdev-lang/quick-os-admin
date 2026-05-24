import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ nome: z.string().min(2).max(120) }).parse(i))
  .handler(async ({ data }) => {
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
    return { imageUrl: url as string };
  });