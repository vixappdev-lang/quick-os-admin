import fs from "node:fs";

const SRC = "public/setup.sql";
const DOC = "docs/setup.sql";
const ADD_COLUMNS_START = "-- === LYNECLOUD: COLUNAS FALTANTES (INÍCIO) ===";
const ADD_COLUMNS_END = "-- === LYNECLOUD: COLUNAS FALTANTES (FIM) ===";

let s = fs.readFileSync(SRC, "utf8");

function normalizeIdempotency(sql) {
  let out = sql;
  out = out.replace(
    /(?:DO\s+\$[a-zA-Z0-9_]*\$\s+BEGIN\s+)+\s*(CREATE TYPE public\.[a-z0-9_]+ AS ENUM \([\s\S]*?\);\s*)(?:EXCEPTION WHEN duplicate_object THEN NULL;\s*END\s+\$[a-zA-Z0-9_]*\$;\s*)+/gi,
    "$1\n",
  );
  out = out.replace(
    /CREATE TYPE (public\.[a-z0-9_]+) AS ENUM \(([\s\S]*?)\);/gi,
    (_m, name, body) => {
      const tag = `$idem_${name.replace(/^public\./, "").replace(/[^a-z0-9_]/gi, "_")}$`;
      return `DO ${tag} BEGIN\n  CREATE TYPE ${name} AS ENUM (${body});\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND ${tag};`;
    },
  );
  out = out.replace(/CREATE TABLE (?!IF NOT EXISTS)(public\.[a-z0-9_]+) \(/g, "CREATE TABLE IF NOT EXISTS $1 (");
  out = out.replace(/CREATE SEQUENCE (?!IF NOT EXISTS)(public\.[a-z0-9_]+)/g, "CREATE SEQUENCE IF NOT EXISTS $1");
  out = out.replace(/CREATE INDEX (?!IF NOT EXISTS)([a-z0-9_]+) ON/g, "CREATE INDEX IF NOT EXISTS $1 ON");
  out = out.replace(/CREATE UNIQUE INDEX (?!IF NOT EXISTS)([a-z0-9_]+) ON/g, "CREATE UNIQUE INDEX IF NOT EXISTS $1 ON");
  out = out.replace(/DROP TRIGGER IF EXISTS [a-z0-9_]+ ON public\.[a-z0-9_]+;\n/g, "");
  out = out.replace(
    /CREATE TRIGGER ([a-z0-9_]+) ([\s\S]*?) ON (public\.[a-z0-9_]+) ([\s\S]*?);/g,
    (_m, name, mid, tbl, rest) => `DROP TRIGGER IF EXISTS ${name} ON ${tbl};\nCREATE TRIGGER ${name} ${mid} ON ${tbl} ${rest};`,
  );
  out = out.replace(/DROP POLICY IF EXISTS [a-z0-9_]+ ON public\.[a-z0-9_]+;\n/g, "");
  out = out.replace(
    /CREATE POLICY ([a-z0-9_]+) ON (public\.[a-z0-9_]+)([\s\S]*?);/g,
    (_m, name, tbl, rest) => `DROP POLICY IF EXISTS ${name} ON ${tbl};\nCREATE POLICY ${name} ON ${tbl}${rest};`,
  );
  out = out.replace(/CREATE FUNCTION /g, "CREATE OR REPLACE FUNCTION ");
  out = out.replace(
    /ALTER TABLE ONLY (public\.[a-z0-9_]+)\s+ADD CONSTRAINT ([a-z0-9_]+) ([\s\S]*?);/g,
    (_m, tbl, cname, rest) => `DO $idem$ BEGIN\n  ALTER TABLE ${tbl} ADD CONSTRAINT ${cname} ${rest};\nEXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;`,
  );
  return out.replace(
    /-- Idempotente:[^\n]*\n-- [^\n]*\n/,
    "-- Idempotente: pode rodar quantas vezes for necessário (criação + atualização).\n-- Seguro em projeto vazio ou já parcialmente migrado.\n",
  );
}

function extractFunctionBlocks(sql) {
  const blocks = [];
  const without = sql.replace(
    /\n--\n-- Name: [^\n]+; Type: FUNCTION;[\s\S]*?(?=\n--\n-- Name: |\n--\n-- PostgreSQL database dump complete|$)/g,
    (block) => {
      blocks.push(block.replace(/CREATE FUNCTION /g, "CREATE OR REPLACE FUNCTION "));
      return "\n";
    },
  );
  return { without, blocks };
}

function removeOldColumnPatch(sql) {
  const start = sql.indexOf(ADD_COLUMNS_START);
  const end = sql.indexOf(ADD_COLUMNS_END);
  if (start === -1 || end === -1 || end < start) return sql;
  return sql.slice(0, start) + sql.slice(end + ADD_COLUMNS_END.length);
}

function removeEnvironmentSpecificGrants(sql) {
  return sql
    .replace(/^.*\bsandbox_exec\b.*\n/gm, "")
    .replace(/\n--\n-- Name: DEFAULT PRIVILEGES FOR (SEQUENCES|FUNCTIONS|TABLES);[\s\S]*?(?=\n--\n-- Name: |\n--\n-- PostgreSQL database dump complete|$)/g, "\n");
}

function collapseBlankRuns(sql) {
  return sql.replace(/\n{4,}/g, "\n\n\n");
}

function buildColumnPatch(sql) {
  const statements = [];
  const tables = sql.matchAll(/CREATE TABLE IF NOT EXISTS (public\.[a-z0-9_]+) \(([\s\S]*?)\n\);/g);
  for (const [, table, body] of tables) {
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim().replace(/,$/, "");
      if (!line || line.startsWith("CONSTRAINT ")) continue;
      const match = /^([a-z0-9_]+)\s+(.+)$/i.exec(line);
      if (!match) continue;
      const nullableDefinition = line.replace(/\s+NOT NULL\b/g, "");
      statements.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${nullableDefinition};`);
    }
    for (const rawLine of body.split("\n")) {
      const constraint = rawLine.trim().replace(/,$/, "");
      if (!constraint.startsWith("CONSTRAINT ")) continue;
      statements.push(`DO $idem$ BEGIN\n  ALTER TABLE ${table} ADD ${constraint};\nEXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;`);
    }
  }
  return `\n\n${ADD_COLUMNS_START}\n-- Completa bancos já existentes/parciais antes de criar constraints, funções, triggers e policies.\n${statements.join("\n")}\n${ADD_COLUMNS_END}\n\n`;
}

s = normalizeIdempotency(removeEnvironmentSpecificGrants(removeOldColumnPatch(s)));
const { without, blocks } = extractFunctionBlocks(s);
s = without;

const firstConstraint = s.search(/\n--\n-- Name: [^\n]+; Type: CONSTRAINT;/);
if (firstConstraint !== -1) {
  s = s.slice(0, firstConstraint) + buildColumnPatch(s) + s.slice(firstConstraint);
}

const functionSql = `\n${blocks.join("\n")}\n`;
const firstTrigger = s.search(/\n--\n-- Name: [^\n]+; Type: TRIGGER;/);
const firstPolicyOrGrant = s.search(/\n--\n-- Name: [^\n]+; Type: (POLICY|ACL);/);
const insertAt = firstTrigger !== -1 ? firstTrigger : firstPolicyOrGrant !== -1 ? firstPolicyOrGrant : s.length;
s = collapseBlankRuns(s.slice(0, insertAt) + functionSql + s.slice(insertAt));

fs.writeFileSync(SRC, s);
fs.writeFileSync(DOC, s);
console.log("OK", s.length, "functions", blocks.length);
