/* eslint-disable no-console */
// Временен тестов админ за journey скриптове: create | delete.
// Ползва същия better-auth hash като seed-а. Изтрива се веднага след теста.
import "dotenv/config";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";
import * as schema from "../src/lib/db/schema";

const email = process.env.JOURNEY_EMAIL;
const password = process.env.JOURNEY_PASSWORD;
const mode = process.argv[2];

async function main() {
  if (!email || !password || !["create", "delete"].includes(mode ?? "")) {
    console.error("Ползване: JOURNEY_EMAIL=... JOURNEY_PASSWORD=... tsx scripts/_journey-admin-user.ts create|delete");
    process.exit(1);
  }

  if (mode === "create") {
    const existing = await db.query.user.findFirst({ where: (u, { eq: e }) => e(u.email, email!) });
    if (existing) {
      console.log(`✓ вече съществува: ${email}`);
      process.exit(0);
    }
    const ctx = await auth.$context;
    const hashed = await ctx.password.hash(password!);
    const userId = nanoid();
    const now = new Date();
    await db.insert(schema.user).values({
      id: userId, name: "Journey Test", email: email!, emailVerified: true, role: "admin", createdAt: now, updatedAt: now,
    });
    await db.insert(schema.account).values({
      id: nanoid(), accountId: userId, providerId: "credential", userId, password: hashed, createdAt: now, updatedAt: now,
    });
    console.log(`✓ създаден тестов админ: ${email}`);
  } else {
    const u = await db.query.user.findFirst({ where: (usr, { eq: e }) => e(usr.email, email!) });
    if (!u) {
      console.log("✓ няма такъв потребител (нищо за триене)");
      process.exit(0);
    }
    await db.delete(schema.session).where(eq(schema.session.userId, u.id));
    await db.delete(schema.account).where(eq(schema.account.userId, u.id));
    await db.delete(schema.user).where(eq(schema.user.id, u.id));
    console.log(`✓ изтрит тестов админ: ${email}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
