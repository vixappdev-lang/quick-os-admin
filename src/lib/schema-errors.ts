// Detecta erros de schema do PostgREST/Supabase (tabelas/colunas faltando)
// e armazena por slug de conexão ativa para a tela /supabase exibir.
import { getActiveTenant } from "@/integrations/supabase/active-client";

const KEY = "schema_errors_v1";

export interface SchemaIssue {
  slug: string;          // slug da conexão ativa no momento do erro ("principal" se central)
  table?: string;
  column?: string;
  code?: string;
  message: string;
  at: string;            // ISO
}

function read(): SchemaIssue[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: SchemaIssue[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
  window.dispatchEvent(new CustomEvent("schema-errors-changed"));
}

/** Tenta extrair tabela/coluna de mensagens típicas do PostgREST. */
function parse(message: string): { table?: string; column?: string } {
  const m: { table?: string; column?: string } = {};
  let r = /Could not find the '?(?:table|relation)'? ['"]?(?:public\.)?([a-z0-9_]+)['"]?/i.exec(message);
  if (r) m.table = r[1];
  r = /relation ['"]?(?:public\.)?([a-z0-9_]+)['"]? does not exist/i.exec(message);
  if (r) m.table = r[1];
  r = /column ['"]?([a-z0-9_]+)['"]? (?:of relation ['"]?([a-z0-9_]+)['"]? )?does not exist/i.exec(message);
  if (r) { m.column = r[1]; if (r[2]) m.table = r[2]; }
  r = /Could not find the ['"]?([a-z0-9_]+)['"]? column of ['"]?([a-z0-9_]+)['"]?/i.exec(message);
  if (r) { m.column = r[1]; m.table = r[2]; }
  return m;
}

const SCHEMA_HINTS = [
  "Could not find",
  "does not exist",
  "schema cache",
  "PGRST20",
  "PGRST204",
  "PGRST205",
];

export function reportSupabaseError(err: any) {
  if (!err) return;
  const message: string = err?.message || String(err);
  const code: string | undefined = err?.code;
  const isSchema =
    SCHEMA_HINTS.some((h) => message.includes(h)) ||
    code === "PGRST204" || code === "PGRST205" || code === "42P01" || code === "42703";
  if (!isSchema) return;
  const tenant = getActiveTenant();
  const slug = tenant?.slug ?? "principal";
  const { table, column } = parse(message);
  const issue: SchemaIssue = { slug, table, column, code, message, at: new Date().toISOString() };
  const list = read();
  // dedupe por slug+table+column+message recente
  const key = `${issue.slug}|${issue.table ?? ""}|${issue.column ?? ""}|${issue.message}`;
  const filtered = list.filter((i) => `${i.slug}|${i.table ?? ""}|${i.column ?? ""}|${i.message}` !== key);
  filtered.unshift(issue);
  write(filtered);
}

export function getSchemaIssues(): SchemaIssue[] { return read(); }
export function getSchemaIssuesBySlug(slug: string): SchemaIssue[] {
  return read().filter((i) => i.slug === slug);
}
export function clearSchemaIssues(slug?: string) {
  if (!slug) write([]);
  else write(read().filter((i) => i.slug !== slug));
}