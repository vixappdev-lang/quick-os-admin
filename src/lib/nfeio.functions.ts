import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE = "https://api.nfe.io";

/**
 * Valida credenciais nfe.io fazendo um GET na empresa cadastrada.
 * Retorna { ok, company?, error? } — não lança para o caller renderizar
 * a mensagem real da API.
 */
export const validateNfeio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        apiKey: z.string().min(10),
        companyId: z.string().min(5),
        environment: z.enum(["Development", "Production"]).default("Production"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const res = await fetch(`${BASE}/v1/companies/${encodeURIComponent(data.companyId)}`, {
        method: "GET",
        headers: {
          Authorization: data.apiKey,
          "Content-Type": "application/json",
          "X-Environment": data.environment,
        },
      });
      const text = await res.text();
      let body: any = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
      if (!res.ok) {
        return {
          ok: false as const,
          status: res.status,
          error:
            body?.message ??
            body?.error ??
            body?.code ??
            `Falha (${res.status}) ao consultar empresa em nfe.io.`,
        };
      }
      return {
        ok: true as const,
        company: {
          id: body?.companyId ?? body?.id ?? data.companyId,
          name: body?.name ?? body?.tradeName ?? null,
          status: body?.status ?? null,
          environment: body?.environment ?? data.environment,
        },
      };
    } catch (err: any) {
      return { ok: false as const, error: err?.message ?? "Erro de rede ao validar nfe.io" };
    }
  });

/**
 * Emite uma NF-e Modelo 55 (productinvoice) a partir do payload já montado
 * no cliente — o caller é responsável pela serialização correta seguindo
 * docs nfe.io. Esta função apenas faz a chamada autenticada.
 */
export const emitNfeio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        apiKey: z.string().min(10),
        companyId: z.string().min(5),
        environment: z.enum(["Development", "Production"]).default("Production"),
        payload: z.record(z.string(), z.any()),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const res = await fetch(
        `${BASE}/v1/companies/${encodeURIComponent(data.companyId)}/productinvoices`,
        {
          method: "POST",
          headers: {
            Authorization: data.apiKey,
            "Content-Type": "application/json",
            "X-Environment": data.environment,
          },
          body: JSON.stringify(data.payload),
        },
      );
      const text = await res.text();
      let body: any = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
      if (!res.ok) {
        return {
          ok: false as const,
          status: res.status,
          error: body?.message ?? body?.error ?? `Falha (${res.status}) ao emitir NF-e.`,
          details: body ?? null,
        };
      }
      return { ok: true as const, invoice: body };
    } catch (err: any) {
      return { ok: false as const, error: err?.message ?? "Erro de rede ao emitir NF-e" };
    }
  });