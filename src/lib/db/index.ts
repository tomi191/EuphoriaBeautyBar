import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL не е зададен");

// Supabase pooler (transaction mode) изисква prepare:false; SSL задължително.
const client = postgres(url, { prepare: false, ssl: "require" });

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
