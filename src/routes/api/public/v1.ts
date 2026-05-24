import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "./v1/_auth";

export const Route = createFileRoute("/api/public/v1")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        return json({
          name: "Quick OS Public API",
          base_url: `${origin}/api/public/v1`,
          endpoints: {
            produtos: `${origin}/api/public/v1/produtos`,
            pedidos: `${origin}/api/public/v1/pedidos`,
          },
        });
      },
    },
  },
});
