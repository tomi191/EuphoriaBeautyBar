import "dotenv/config";
import type { Config } from "drizzle-kit";

// За миграции ползваме session pooler-а (5432); app-ът ползва transaction pooler (6543).
const url = process.env.DATABASE_URL_SESSION ?? process.env.DATABASE_URL ?? "";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  casing: "snake_case",
} satisfies Config;
