"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { slugify } from "@/lib/utils";

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
  await db
    .update(schema.teamMembers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.teamMembers.id, id));
  revalidateAll();
}

export async function deleteTeamMember(id: string) {
  await requireAdmin();
  await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, id));
  revalidateAll();
}
