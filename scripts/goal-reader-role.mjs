// Цел П1 (решение 7, 24.11.2026): ролята само за четене goal_reader за Капела.
// Вижда само изгледите в схемата goal_stats (бройки, без клиентски полета): drizzle/manual/0005_goal_counters.sql.
// Паролата се генерира тук, в базата отива само SCRAM отпечатъкът (не стои като текст в дневника на базата),
// а адресът за връзка се записва в env файла като GOAL_READER_DATABASE_URL. Нищо от тях не се печата.
//
//   node scripts/goal-reader-role.mjs check  --env <.env.local>            само четене: ролята и правата ѝ
//   node scripts/goal-reader-role.mjs create --env <.env.local> [--live]   прави ролята, пише адреса, влиза като нея
//   node scripts/goal-reader-role.mjs drop   --env <.env.local> [--live]   маха ролята и реда в env файла
//
// Връзката на собственика на базата идва от DATABASE_URL_SESSION (иначе DATABASE_URL) в същия env файл.
// База извън този компютър (живата) иска --live.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";
import dotenv from "dotenv";
import postgres from "postgres";

const ROLE = "goal_reader";
const VAR = "GOAL_READER_DATABASE_URL";
const VIEWS = ["goal_stats.bookings_weekly", "goal_stats.call_clicks_daily"];

const mode = process.argv[2];
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
};
const envFile = arg("--env");
const live = process.argv.includes("--live");
if (!["check", "create", "drop"].includes(mode) || !envFile) {
  console.error("режим: check | create | drop --env <.env.local> [--live]");
  process.exit(2);
}

const env = dotenv.parse(readFileSync(envFile));
const adminUrl = env.DATABASE_URL_SESSION || env.DATABASE_URL;
if (!adminUrl) {
  console.error("DATABASE_URL_SESSION / DATABASE_URL липсва в env файла");
  process.exit(2);
}
const au = new URL(adminUrl);
const local = /^(127\.0\.0\.1|localhost)$/.test(au.hostname);
if (!local && !live && mode !== "check") {
  console.error("СПИРАМ: базата не е на този компютър; за живата добави --live.");
  process.exit(2);
}
console.log(`връзка: хост ${au.hostname}:${au.port}, база ${au.pathname.slice(1)}${local ? " (ПРОБА)" : " (ЖИВА)"}`);
const ssl = local ? false : "require";
const sql = postgres(adminUrl, { prepare: false, ssl, max: 1, onnotice: () => {} });

// SCRAM-SHA-256 отпечатък по RFC 5802 / 7677, във вида, който Postgres пази в pg_authid.
function scramVerifier(password, iterations = 4096) {
  const salt = randomBytes(16);
  const salted = pbkdf2Sync(password.normalize("NFKC"), salt, iterations, 32, "sha256");
  const clientKey = createHmac("sha256", salted).update("Client Key").digest();
  const storedKey = createHash("sha256").update(clientKey).digest();
  const serverKey = createHmac("sha256", salted).update("Server Key").digest();
  return `SCRAM-SHA-256$${iterations}:${salt.toString("base64")}$${storedKey.toString("base64")}:${serverKey.toString("base64")}`;
}

// Адресът за ролята: същият хост и база; на пула на Supabase потребителят е <роля>.<проект>.
function readerUrl(password) {
  const u = new URL(adminUrl);
  const ref = decodeURIComponent(u.username).split(".")[1];
  u.username = ref ? `${ROLE}.${ref}` : ROLE;
  u.password = encodeURIComponent(password);
  return u.toString();
}

function setEnvVar(file, name, value) {
  const raw = readFileSync(file, "utf8");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/).filter((l) => !l.startsWith(`${name}=`));
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  if (value !== null) lines.push(`${name}=${value}`);
  writeFileSync(file, lines.join(nl) + nl);
}

async function snapshot() {
  const role = (await sql`select rolcanlogin, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolbypassrls, rolconnlimit, rolconfig
                          from pg_roles where rolname = ${ROLE}`)[0] ?? null;
  const tableGrants = (await sql`select table_schema || '.' || table_name as t, privilege_type as p
                                 from information_schema.role_table_grants where grantee = ${ROLE} order by 1, 2`).map((r) => `${r.t}:${r.p}`);
  const schemaUsage = (await sql`select nspname from pg_namespace where has_schema_privilege(${ROLE}::text, oid, 'USAGE') and nspname in ('goal_stats', 'public')`
    .catch(() => [])).map((r) => r.nspname);
  const views = (await sql`select count(*)::int as n from pg_views where schemaname = 'goal_stats'`)[0].n;
  const others = [];
  for (const r of ["anon", "authenticated"]) {
    const exists = (await sql`select 1 from pg_roles where rolname = ${r}`).length > 0;
    if (!exists) continue;
    for (const v of VIEWS) {
      const ok = (await sql`select to_regclass(${v}) is not null as ok`)[0].ok;
      if (ok && (await sql`select has_table_privilege(${r}, ${v}, 'SELECT') as s`)[0].s) others.push(`${r}:${v}`);
    }
  }
  return { role, tableGrants, schemaUsage, goalViews: views, othersCanRead: others };
}

// Влиза като ролята и доказва: бройките се четат, таблиците отдолу не, писане няма.
async function proveReader(url) {
  const r = postgres(url, { prepare: false, ssl, max: 1, onnotice: () => {}, connect_timeout: 15 });
  const out = {};
  try {
    out.bookingsWeeklyRows = (await r`select count(*)::int as n from goal_stats.bookings_weekly`)[0].n;
    out.bookingsTotal = (await r`select coalesce(sum(booked), 0)::int as n from goal_stats.bookings_weekly`)[0].n;
    out.callClicksRows = (await r`select count(*)::int as n from goal_stats.call_clicks_daily`)[0].n;
    out.readOnly = (await r`select current_setting('transaction_read_only') as v`)[0].v;
    const denied = async (q) => {
      try {
        await r.unsafe(q);
        return "МИНА (лошо)";
      } catch (e) {
        return e.code ?? "грешка";
      }
    };
    out.bookingsTable = await denied("select 1 from public.bookings limit 1");
    out.clientsTable = await denied("select 1 from public.clients limit 1");
    out.callClicksTable = await denied("select 1 from public.call_clicks limit 1");
    out.writeView = await denied("insert into goal_stats.call_clicks_daily values (current_date, '/x', 'tel', 'page', 1)");
    out.createTable = await denied("create table goal_stats.x (a int)");
  } finally {
    await r.end({ timeout: 5 });
  }
  const ok =
    out.readOnly === "on" &&
    ["bookingsTable", "clientsTable", "callClicksTable", "writeView", "createTable"].every((k) => /^(42501|25006)$/.test(out[k]));
  return { ok, out };
}

try {
  const before = await snapshot();
  console.log("ПРЕДИ:", JSON.stringify({ ...before, role: before.role ? "има" : "няма" }));
  if (mode === "check") {
    if (before.role) console.log("РОЛЯТА:", JSON.stringify(before.role));
    if (env[VAR] && before.role) {
      const p = await proveReader(env[VAR]);
      console.log("ВХОД КАТО РОЛЯТА:", JSON.stringify(p.out), p.ok ? "наред" : "НЕ Е НАРЕД");
    }
    process.exit(0);
  }

  if (mode === "create") {
    if (before.role) {
      console.error("СПИРАМ: ролята вече я има; не я правя наново.");
      process.exit(3);
    }
    if (before.goalViews !== VIEWS.length) {
      console.error("СПИРАМ: изгледите в goal_stats липсват; първо 0005_goal_counters.sql.");
      process.exit(3);
    }
    const password = randomBytes(24).toString("base64url");
    const verifier = scramVerifier(password);
    await sql.begin(async (tx) => {
      await tx.unsafe(
        `CREATE ROLE ${ROLE} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 3 PASSWORD '${verifier}'`,
      );
      await tx.unsafe(`ALTER ROLE ${ROLE} SET default_transaction_read_only = on`);
      await tx.unsafe(`ALTER ROLE ${ROLE} SET statement_timeout = '15s'`);
      await tx.unsafe(`ALTER ROLE ${ROLE} SET idle_in_transaction_session_timeout = '30s'`);
      await tx.unsafe(`GRANT USAGE ON SCHEMA goal_stats TO ${ROLE}`);
      await tx.unsafe(`GRANT SELECT ON ${VIEWS.join(", ")} TO ${ROLE}`);
    });
    setEnvVar(envFile, VAR, readerUrl(password));
    console.log(`ПУСНАТО: ролята е направена; адресът е записан в env файла като ${VAR}.`);
    const after = await snapshot();
    console.log("СЛЕД:", JSON.stringify({ ...after, role: after.role ? "има" : "няма" }));
    const p = await proveReader(readerUrl(password));
    console.log("ВХОД КАТО РОЛЯТА:", JSON.stringify(p.out));
    const ok =
      p.ok &&
      after.role?.rolcanlogin === true &&
      after.role.rolsuper === false &&
      after.role.rolbypassrls === false &&
      after.tableGrants.length === VIEWS.length &&
      after.tableGrants.every((g) => g.endsWith(":SELECT") && g.startsWith("goal_stats.")) &&
      after.schemaUsage.includes("goal_stats") &&
      after.othersCanRead.length === 0;
    console.log(ok ? "СВЕРКА: наред" : "СВЕРКА: НЕ Е НАРЕД");
    process.exitCode = ok ? 0 : 4;
  }

  if (mode === "drop") {
    if (before.role) {
      await sql.begin(async (tx) => {
        if (before.goalViews > 0) {
          await tx.unsafe(`REVOKE ALL ON ${VIEWS.join(", ")} FROM ${ROLE}`);
          await tx.unsafe(`REVOKE ALL ON SCHEMA goal_stats FROM ${ROLE}`);
        }
        await tx.unsafe(`DROP ROLE ${ROLE}`);
      });
    }
    setEnvVar(envFile, VAR, null);
    const after = await snapshot();
    console.log("СЛЕД:", JSON.stringify({ ...after, role: after.role ? "има" : "няма" }));
    const ok = after.role === null && after.tableGrants.length === 0;
    console.log(ok ? "СВЕРКА: наред" : "СВЕРКА: НЕ Е НАРЕД");
    process.exitCode = ok ? 0 : 4;
  }
} catch (e) {
  console.error("ГРЕШКА:", e?.code ?? "", e?.message ?? e);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
