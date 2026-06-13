import { config } from "dotenv";
import type { Config } from "drizzle-kit";

// .env.local ПЪРВИ: реалният Supabase URL живее там (.env още носи стария file:./local.db).
// dotenv не override-ва вече зададени → редът е важен. Без това db:push дърпаше libSQL URL.
config({ path: ".env.local" });
config();

// За миграции ползваме session pooler-а (5432); app-ът ползва transaction pooler (6543).
const url = process.env.DATABASE_URL_SESSION ?? process.env.DATABASE_URL ?? "";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  casing: "snake_case",
} satisfies Config;
