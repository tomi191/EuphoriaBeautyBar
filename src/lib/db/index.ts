import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL не е зададен");

// Supabase pooler (transaction mode) изисква prepare:false; SSL задължително.
// connect_timeout: бърз ясен fail вместо 60s hang при мрежови проблеми (Vercel build).
// max: 20 — build workers-ите са нишки в ЕДИН процес и делят pool-а; малък pool
// прави опашка при паралелен prerender (15 страници × по няколко заявки) → timeout.
const client = postgres(url, { prepare: false, ssl: "require", connect_timeout: 15, max: 20 });

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
