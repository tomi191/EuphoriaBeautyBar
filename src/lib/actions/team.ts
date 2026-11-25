"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { slugify } from "@/lib/utils";
import { processTeamPhoto, removeTeamPhotoIfUnused, TEAM_BUCKET, TEAM_PHOTO_ERRORS, teamStorage } from "@/lib/images/team-photo";

// Всички страници, които четат екипа през getTeam(). Един списък, за да не се разминава.
const TEAM_PATHS = ["/admin/team", "/", "/za-nas", "/salon-varna-levski", "/uslugi/balayazh-varna"] as const;

function revalidateAll() {
  for (const p of TEAM_PATHS) revalidatePath(p);
}

const teamSchema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  role: z.string().min(2),
  bio: z.string().min(10),
  experience: z.string().min(1),
  image: z.string().nullable().optional(),
  specialties: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export type TeamInput = z.infer<typeof teamSchema>;

export async function createTeamMember(input: TeamInput) {
  await requireAdmin();
  const data = teamSchema.parse(input);
  const id = nanoid();
  const slug = slugify(data.name);
  await db.insert(schema.teamMembers).values({
    id,
    slug,
    name: data.name,
    role: data.role,
    bio: data.bio,
    experience: data.experience,
    image: data.image ?? null,
    specialties: data.specialties,
    active: data.active,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  revalidateAll();
  return { id };
}

export async function updateTeamMember(id: string, input: TeamInput) {
  await requireAdmin();
  const data = teamSchema.parse(input);
  const before = await db.query.teamMembers.findFirst({ where: (t, { eq }) => eq(t.id, id), columns: { image: true } });
  await db
    .update(schema.teamMembers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.teamMembers.id, id));
  if (before?.image && before.image !== (data.image ?? null)) await removeTeamPhotoIfUnused(before.image);
  revalidateAll();
}

/** «Качи снимка» в «Екип»: същата обработка и същото хранилище като снимката на изпълнител (PR №57). */
export async function uploadTeamMemberPhoto(formData: FormData) {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: TEAM_PHOTO_ERRORS.none };
  if (file.size > 5 * 1024 * 1024) return { ok: false as const, error: TEAM_PHOTO_ERRORS.tooBig };
  const res = await processTeamPhoto(Buffer.from(await file.arrayBuffer()));
  if (!res.ok) return res;
  const s = teamStorage();
  if (!s) return { ok: false as const, error: "Качването не е настроено (липсват ключовете за хранилището)." };
  await s.client.storage.createBucket(TEAM_BUCKET, { public: true }).catch(() => {}); // idempotent
  const path = `member-${nanoid(10)}-${Date.now()}.webp`;
  const { error } = await s.client.storage.from(TEAM_BUCKET).upload(path, res.webp, { contentType: "image/webp" });
  if (error) return { ok: false as const, error: "Грешка при качване. Опитай пак." };
  return { ok: true as const, url: `${s.prefix}${path}` };
}

/** Качена, но незапазена снимка (затворена форма, «Махни» или нова снимка): трие се, ако никой не я ползва. */
export async function discardTeamMemberPhoto(url: string) {
  await requireAdmin();
  await removeTeamPhotoIfUnused(url);
}

export async function deleteTeamMember(id: string) {
  await requireAdmin();
  await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, id));
  revalidateAll();
}
