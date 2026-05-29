// Helpers server-only para integração OAuth com Supabase Management API.
// NUNCA importe esse arquivo em código de cliente.
import setupSql from "../../public/setup.sql?raw";

const AUTHORIZE_URL = "https://api.supabase.com/v1/oauth/authorize";
const TOKEN_URL = "https://api.supabase.com/v1/oauth/token";
const API = "https://api.supabase.com/v1";

export const SUPABASE_SETUP_SQL: string = setupSql;

function basicAuthHeader() {
  const id = process.env.SB_OAUTH_CLIENT_ID;
  const secret = process.env.SB_OAUTH_CLIENT_SECRET;
  if (!id || !secret) throw new Error("SB_OAUTH_CLIENT_ID/SECRET ausentes.");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export function buildAuthorizeUrl(opts: { state: string; redirectUri: string }) {
  const id = process.env.SB_OAUTH_CLIENT_ID;
  if (!id) throw new Error("SB_OAUTH_CLIENT_ID ausente.");
  const u = new URL(AUTHORIZE_URL);
  u.searchParams.set("client_id", id);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", opts.redirectUri);
  u.searchParams.set("state", opts.state);
  return u.toString();
}

export async function exchangeCode(opts: { code: string; redirectUri: string }) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange falhou: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

async function mgmt(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase API ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function listProjects(token: string): Promise<Array<{
  id: string; name: string; organization_id: string; region: string; status: string;
}>> {
  return mgmt(token, "/projects");
}

export async function getProjectApiKeys(token: string, ref: string) {
  // Retorna array [{ name, api_key }] — name inclui "anon" e "service_role" (legacy)
  const keys: Array<{ name: string; api_key: string }> = await mgmt(token, `/projects/${ref}/api-keys?reveal=true`);
  const anon = keys.find((k) => k.name === "anon")?.api_key;
  const service = keys.find((k) => k.name === "service_role")?.api_key;
  return { anon, service };
}

export async function runQuery(token: string, ref: string, query: string) {
  return mgmt(token, `/projects/${ref}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export function projectUrl(ref: string) {
  return `https://${ref}.supabase.co`;
}
