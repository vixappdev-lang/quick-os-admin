import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Webhook público da nfe.io.
// Configurado pelo cliente no painel da nfe.io apontando para:
//   https://project--<id>.lovable.app/api/public/nfeio-webhook
//
// Segurança: o segredo é gerado pelo nosso app e o cliente cola na nfe.io
// como header `X-Webhook-Secret`. Validamos comparação direta — a nfe.io
// não assina HMAC padronizado, então usamos shared-secret.

export const Route = createFileRoute("/api/public/nfeio-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!SUPABASE_URL || !SERVICE_KEY) {
          return new Response("Server misconfigured", { status: 500 });
        }
        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
          auth: { persistSession: false },
        });

        const body = await request.text();
        const headerSecret =
          request.headers.get("x-webhook-secret") ??
          request.headers.get("x-nfeio-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";

        const { data: settings } = await admin
          .from("app_settings")
          .select("nfeio_webhook_secret, nfeio_webhook_events")
          .eq("id", "main")
          .maybeSingle();

        const expected = (settings as any)?.nfeio_webhook_secret ?? "";
        if (!expected || headerSecret !== expected) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any = {};
        try { payload = JSON.parse(body); } catch { /* body vazio */ }

        const evento: string =
          payload?.event ?? payload?.eventType ?? payload?.type ?? "unknown";

        // só grava se o evento estiver habilitado pelo usuário
        const enabled = ((settings as any)?.nfeio_webhook_events ?? {}) as Record<string, boolean>;
        const isEnabled = Object.keys(enabled).length === 0 || enabled[evento] === true;
        if (!isEnabled) {
          return new Response("ok (ignored)", { status: 200 });
        }

        // tenta deduzir pedido vinculado pelo nfe_id que salvamos ao emitir
        const invoiceId: string | null =
          payload?.data?.id ?? payload?.data?.invoiceId ?? payload?.invoiceId ?? null;

        let pedidoId: string | null = null;
        if (invoiceId) {
          const { data: ped } = await admin
            .from("pedidos")
            .select("id")
            .eq("nfe_id", invoiceId)
            .maybeSingle();
          pedidoId = (ped as any)?.id ?? null;
        }

        await admin.from("nfe_webhook_events").insert({
          evento,
          payload,
          pedido_id: pedidoId,
        });

        if (pedidoId) {
          const patch: any = { nfe_status: payload?.data?.status ?? evento };
          if (payload?.data?.pdf?.url) patch.nfe_pdf_url = payload.data.pdf.url;
          if (payload?.data?.xml?.url) patch.nfe_xml_url = payload.data.xml.url;
          if (payload?.data?.number) patch.nfe_numero = String(payload.data.number);
          if (payload?.data?.accessKey || payload?.data?.acessKey) {
            patch.nfe_chave = String(payload.data.accessKey ?? payload.data.acessKey);
          }
          await admin.from("pedidos").update(patch).eq("id", pedidoId);
        }

        await admin.from("app_logs").insert({
          categoria: "webhook",
          mensagem: `nfe.io: ${evento}`,
          payload: { evento, invoiceId, pedidoId, raw: payload },
        } as any);

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      GET: async () => {
        return new Response("nfe.io webhook endpoint — POST only", { status: 200 });
      },
    },
  },
});