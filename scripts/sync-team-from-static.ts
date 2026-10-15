/* eslint-disable no-console */
import "./load-env";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Еднократно синхронизира статичния src/lib/data/team.ts в таблицата team_members,
 * за да вижда админът реалния основател на /admin/team (публичният сайт вече чете
 * от базата през getTeam()). Идемпотентно upsert по slug; id/sortOrder/createdAt на
 * съществуващ ред се пазят. Dry-run по подразбиране, `--apply` пише.
 */
const APPLY = process.argv.includes("--apply");

async function main() {
  const { db, schema } = await import("../src/lib/db");
  const { team } = await import("../src/lib/data/team");

  for (const m of team) {
    const target = {
      name: m.name,
      role: m.role,
      bio: m.bio,
      image: m.image,
      experience: m.experience,
      specialties: m.specialties,
      active: true,
    };
    const existing = await db.query.teamMembers.findFirst({ where: (t, { eq: e }) => e(t.slug, m.slug) });

    if (!existing) {
      console.log(`+ ${m.slug}: ще се СЪЗДАДЕ`, target);
      if (APPLY) {
        await db.insert(schema.teamMembers).values({
          id: nanoid(),
          slug: m.slug,
          ...target,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      continue;
    }

    let changed = 0;
    for (const [k, v] of Object.entries(target)) {
      const before = (existing as Record<string, unknown>)[k];
      if (JSON.stringify(before) === JSON.stringify(v)) continue;
      changed++;
      console.log(`~ ${m.slug}.${k}\n    преди: ${JSON.stringify(before)}\n    след:  ${JSON.stringify(v)}`);
    }
    if (!changed) console.log(`= ${m.slug}: без промяна`);
    else if (APPLY) {
      await db.update(schema.teamMembers).set({ ...target, updatedAt: new Date() }).where(eq(schema.teamMembers.id, existing.id));
    }
  }

  console.log(APPLY ? "\nПРИЛОЖЕНО." : "\nDRY-RUN (нищо не е записано). Добави --apply за запис.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
