/** Създава bot_queries таблицата (идемпотентно) — db:push е счупен, затова raw SQL. */
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function main() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bot_queries (
      id text PRIMARY KEY,
      message text NOT NULL,
      intent text NOT NULL,
      matched boolean NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  const rows = await db.execute(sql`SELECT count(*)::int AS n FROM bot_queries`);
  console.log("bot_queries готова; редове:", (rows as unknown as { n: number }[])[0]?.n ?? rows);
  process.exit(0);
}

main().catch((e) => {
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
});
