"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { validatePrice, validateServiceTiming } from "@/lib/booking/service-rules";

const serviceItemSchema = z.object({
  categoryId: z.string(),
  groupTitle: z.string().min(2),
  name: z.string().min(2),
  price: z.number(),
  priceMax: z.number().nullable().optional(),
  priceFrom: z.boolean().default(false),
  currency: z.string().min(1).default("лв"),
  duration: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  durationMin: z.number().default(30),
  bufferMin: z.number().default(10),
  activeMin: z.coerce.number().default(0),
  processingMin: z.coerce.number().default(0),
  bookableOnline: z.boolean().default(true),
}).superRefine((d, ctx) => {
  // Правилата живеят в service-rules (общи със staff PWA); тук само ги закачаме към zod.
  const msg = validatePrice(d.price, d.priceMax) ?? validateServiceTiming(d);
  if (msg) ctx.addIssue({ code: "custom", message: msg });
});

type SaveResult = { ok: true } | { ok: false; error: string };

/** Валидацията връща грешка като стойност (не throw) — server action throw се маскира на клиента. */
function parseInput(input: ServiceItemInput) {
  const r = serviceItemSchema.safeParse(input);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Провери въведените данни." } as const;
  return { ok: true, data: r.data } as const;
}

export type ServiceItemInput = z.infer<typeof serviceItemSchema>;

/** Опреснява всички места, които показват цени/услуги от каталога. */
function revalidateCatalog() {
  revalidatePath("/admin/services");
  revalidatePath("/uslugi");
  revalidatePath("/uslugi/[slug]", "page");
  // Статичните landing-и рендират цени от каталога — иначе замръзват до deploy.
  revalidatePath("/uslugi/boyadisvane-na-kosa-varna");
  revalidatePath("/uslugi/kichuri-varna");
  revalidatePath("/uslugi/pochistvane-na-litse-varna");
  revalidatePath("/uslugi/kola-maska-varna");
  revalidatePath("/uslugi/vezhdi-i-migli-varna");
  revalidatePath("/"); // home — featured services
  revalidatePath("/zapazi-chas"); // онлайн записване
}

export async function createServiceItem(input: ServiceItemInput): Promise<SaveResult> {
  await requireAdmin();
  const parsed = parseInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const data = parsed.data;
  await db.insert(schema.serviceItems).values({
    id: nanoid(),
    ...data,
    priceMax: data.priceMax ?? null,
    duration: data.duration ?? null,
    description: data.description ?? null,
    sortOrder: 0,
  });
  revalidateCatalog();
  return { ok: true };
}

export async function updateServiceItem(id: string, input: ServiceItemInput): Promise<SaveResult> {
  await requireAdmin();
  const parsed = parseInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const data = parsed.data;
  await db
    .update(schema.serviceItems)
    .set({
      ...data,
      priceMax: data.priceMax ?? null,
      duration: data.duration ?? null,
      description: data.description ?? null,
    })
    .where(eq(schema.serviceItems.id, id));
  revalidateCatalog();
  return { ok: true };
}

export async function deleteServiceItem(id: string) {
  await requireAdmin();
  await db.delete(schema.serviceItems).where(eq(schema.serviceItems.id, id));
  revalidateCatalog();
}
