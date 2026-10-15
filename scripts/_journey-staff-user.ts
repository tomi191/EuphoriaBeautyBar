/* eslint-disable no-console */
// Временен тестов STAFF акаунт за journey скриптове: create | delete.
// Създава user(role=staff) + account + resource(active=false, kind=hair) — неактивен
// изпълнител не излиза в публичния избор. delete чисти resource_services, resource,
// session, account, user. Пускане: JOURNEY_EMAIL=... JOURNEY_PASSWORD=... npx tsx scripts/_journey-staff-user.ts create|delete
import "./load-env";
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
    console.error("Ползване: JOURNEY_EMAIL=... JOURNEY_PASSWORD=... tsx scripts/_journey-staff-user.ts create|delete");
    process.exit(1);
  }
  if (mode === "create") {
    const existing = await db.query.user.findFirst({ where: (u, { eq: e }) => e(u.email, email!) });
    if (existing) { console.log(`✓ вече съществува: ${email}`); process.exit(0); }
    const ctx = await auth.$context;
    const hashed = await ctx.password.hash(password!);
    const userId = nanoid();
    const now = new Date();
    await db.insert(schema.user).values({ id: userId, name: "Journey Staff", email: email!, emailVerified: true, role: "staff", createdAt: now, updatedAt: now });
    await db.insert(schema.account).values({ id: nanoid(), accountId: userId, providerId: "credential", userId, password: hashed, createdAt: now, updatedAt: now });
    await db.insert(schema.resources).values({ id: `journey-${nanoid(8)}`, name: "Journey Staff", kind: "hair", userId, active: false, sortOrder: 999, createdAt: now, updatedAt: now });
    console.log(`✓ създаден тестов staff: ${email}`);
  } else {
    const u = await db.query.user.findFirst({ where: (usr, { eq: e }) => e(usr.email, email!) });
    if (!u) { console.log("✓ няма такъв потребител"); process.exit(0); }
    const res = await db.query.resources.findMany({ where: (r, { eq: e }) => e(r.userId, u.id) });
    for (const r of res) {
      await db.delete(schema.resourceServices).where(eq(schema.resourceServices.resourceId, r.id));
      await db.delete(schema.resources).where(eq(schema.resources.id, r.id));
    }
    await db.delete(schema.session).where(eq(schema.session.userId, u.id));
    await db.delete(schema.account).where(eq(schema.account.userId, u.id));
    await db.delete(schema.user).where(eq(schema.user.id, u.id));
    console.log(`✓ изтрит тестов staff: ${email} (${res.length} resource)`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
