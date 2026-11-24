import { db, schema } from "@/lib/db";

/**
 * Писменото съгласие на специалист под наем за първо име и снимка на сайта. Пази се в
 * site_settings (ключ → { [resourceId]: { at } }), без нова колона в resources: миграция на
 * живата база не трябва. `at` е кога админът го е отбелязал (доказателство при въпрос).
 */
export const CONSENT_KEY = "tenant_public_consent";

export type ConsentMap = Record<string, { at: string }>;

export async function getConsentMap(): Promise<ConsentMap> {
  const row = await db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, CONSENT_KEY) });
  const v = row?.value;
  return v && typeof v === "object" && !Array.isArray(v) ? (v as ConsentMap) : {};
}

/** Отбелязва (on=true) или маха съгласието. Не е server action: вика се от actions/resources.ts. */
export async function setConsent(resourceId: string, on: boolean): Promise<void> {
  const map = await getConsentMap();
  if (on) {
    if (map[resourceId]) return;
    map[resourceId] = { at: new Date().toISOString() };
  } else {
    if (!map[resourceId]) return;
    delete map[resourceId];
  }
  await db
    .insert(schema.siteSettings)
    .values({ key: CONSENT_KEY, value: map, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value: map, updatedAt: new Date() } });
}

/** Изпълнителите, вързани към вход на админ (Снежана): те не са наематели. */
export async function adminResourceUserIds(): Promise<Set<string>> {
  const admins = await db.query.user.findMany({ where: (u, { eq }) => eq(u.role, "admin"), columns: { id: true } });
  return new Set(admins.map((a) => a.id));
}
