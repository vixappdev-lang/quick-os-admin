import { createFileRoute } from "@tanstack/react-router";
import { getCookie, setCookie, getRequestHost } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { exchangeCode } from "@/lib/supabase-oauth.server";

export const Route = createFileRoute("/api/supabase-oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const err = url.searchParams.get("error");
        const host = getRequestHost();
        const proto = host.includes("localhost") ? "http" : "https";
        const back = (qs: string) =>
          Response.redirect(`${proto}://${host}/supabase?${qs}`, 302);

        if (err) return back(`oauth_err=${encodeURIComponent(err)}`);
        if (!code || !state) return back("oauth_err=missing_code_or_state");

        const cookieState = getCookie("sb_oauth_state");
        if (!cookieState || cookieState !== state) {
          return back("oauth_err=state_mismatch");
        }

        // limpa cookie
        setCookie("sb_oauth_state", "", { path: "/", maxAge: 0 });

        // confere state no banco
        const { data: row } = await supabaseAdmin
          .from("supabase_oauth_states").select("state").eq("state", state).maybeSingle();
        if (!row) return back("oauth_err=state_not_found");

        try {
          const tok = await exchangeCode({
            code,
            redirectUri: `${proto}://${host}/api/supabase-oauth/callback`,
          });
          const expiresAt = new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString();
          const { error } = await supabaseAdmin.from("supabase_oauth_states").update({
            access_token: tok.access_token,
            refresh_token: tok.refresh_token,
            expires_at: expiresAt,
          }).eq("state", state);
          if (error) return back(`oauth_err=${encodeURIComponent(error.message)}`);
        } catch (e: any) {
          return back(`oauth_err=${encodeURIComponent(e?.message || "exchange_failed")}`);
        }

        return back(`oauth_state=${state}`);
      },
    },
  },
});
