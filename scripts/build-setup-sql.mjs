import fs from 'node:fs';
const SRC = 'public/setup.sql';
let s = fs.readFileSync(SRC, 'utf8');

// 1) CREATE TYPE ... AS ENUM (...) ;  -> wrap in DO block
s = s.replace(
  /CREATE TYPE (public\.[a-z0-9_]+) AS ENUM \(([\s\S]*?)\);/g,
  (_m, name, body) => `DO $idem$ BEGIN
  CREATE TYPE ${name} AS ENUM (${body});
EXCEPTION WHEN duplicate_object THEN NULL; END $idem$;`
);

// 2) CREATE TABLE public.X (  -> CREATE TABLE IF NOT EXISTS
s = s.replace(/CREATE TABLE (public\.[a-z0-9_]+) \(/g, 'CREATE TABLE IF NOT EXISTS $1 (');

// 3) CREATE SEQUENCE public.X -> IF NOT EXISTS
s = s.replace(/CREATE SEQUENCE (public\.[a-z0-9_]+)/g, 'CREATE SEQUENCE IF NOT EXISTS $1');

// 4) CREATE [UNIQUE] INDEX name -> IF NOT EXISTS
s = s.replace(/CREATE INDEX ([a-z0-9_]+) ON/g, 'CREATE INDEX IF NOT EXISTS $1 ON');
s = s.replace(/CREATE UNIQUE INDEX ([a-z0-9_]+) ON/g, 'CREATE UNIQUE INDEX IF NOT EXISTS $1 ON');

// 5) CREATE TRIGGER name ... ON table ... ;  -> prepend DROP TRIGGER IF EXISTS
s = s.replace(
  /CREATE TRIGGER ([a-z0-9_]+) ([\s\S]*?) ON (public\.[a-z0-9_]+) ([\s\S]*?);/g,
  (_m, name, mid, tbl, rest) =>
    `DROP TRIGGER IF EXISTS ${name} ON ${tbl};
CREATE TRIGGER ${name} ${mid} ON ${tbl} ${rest};`
);

// 6) CREATE POLICY name ON table ... ;  -> prepend DROP POLICY IF EXISTS
s = s.replace(
  /CREATE POLICY ([a-z0-9_]+) ON (public\.[a-z0-9_]+)([\s\S]*?);/g,
  (_m, name, tbl, rest) =>
    `DROP POLICY IF EXISTS ${name} ON ${tbl};
CREATE POLICY ${name} ON ${tbl}${rest};`
);

// 7) ALTER TABLE ONLY public.X \n    ADD CONSTRAINT name ... ;  -> wrap in DO block
s = s.replace(
  /ALTER TABLE ONLY (public\.[a-z0-9_]+)\s+ADD CONSTRAINT ([a-z0-9_]+) ([\s\S]*?);/g,
  (_m, tbl, cname, rest) => `DO $idem$ BEGIN
  ALTER TABLE ${tbl} ADD CONSTRAINT ${cname} ${rest};
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;`
);

// header note
s = s.replace(
  /-- Idempotente:[^\n]*\n-- [^\n]*\n/,
  '-- Idempotente: pode rodar quantas vezes for necessário (criação + atualização).\n-- Seguro em projeto vazio ou já parcialmente migrado.\n'
);

fs.writeFileSync(SRC, s);
fs.writeFileSync('docs/setup.sql', s);
console.log('OK', s.length);
