/**
 * Сменя паролата на staff акаунт. Паролата се подава през env (НЕ се hardcode-ва).
 * Ползвай за ротация на компрометирани пароли.
 *
 * Пускане (PowerShell):
 *   $env:RESET_EMAIL="admin@euphoriabeauty.eu"; $env:RESET_PASSWORD="…нова…"; npx tsx --env-file=.env.local scripts/reset-staff-password.ts
 * Пускане (bash):
 *   RESET_EMAIL=admin@euphoriabeauty.eu RESET_PASSWORD='…нова…' npx tsx --env-file=.env.local scripts/reset-staff-password.ts
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";
import { auth } from "../src/lib/auth";

async function main() {
  const email = process.env.RESET_EMAIL;
  const newPassword = process.env.RESET_PASSWORD;
  if (!email || !newPassword) {
    console.error("✗ Задай RESET_EMAIL + RESET_PASSWORD в средата.");
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error("✗ Паролата трябва да е поне 8 символа.");
    process.exit(1);
  }

  const user = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, email) });
  if (!user) { console.error(`✗ Няма потребител с имейл ${email}`); process.exit(1); }

  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(newPassword);
  await db
    .update(schema.account)
    .set({ password: hashed, updatedAt: new Date() })
    .where(and(eq(schema.account.userId, user.id), eq(schema.account.providerId, "credential")));

  console.log(`✅ Паролата за ${email} е сменена. Старите сесии остават валидни до изтичане — при нужда излез отвсякъде.`);
  process.exit(0);
}
main().catch((e) => { console.error("✗", e?.message ?? e); process.exit(1); });
