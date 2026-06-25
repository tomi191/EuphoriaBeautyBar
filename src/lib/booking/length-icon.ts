import { slugify } from "@/lib/utils";

/**
 * Снимка за услуга — УНИКАЛНА реалистична снимка per услуга, генерирана през KIE
 * (scripts/gen-unique-images.ts, сцени от Workflow). Файлът е по slug на името:
 * public/images/services/unique/<slug>.png. Нова услуга → регенерирай със скрипта.
 */
export function serviceImageFor(name: string, _groupTitle?: string): string | null {
  if (!name?.trim()) return null;
  return `/images/services/unique/${slugify(name)}.webp`;
}

/** @deprecated — ползвай serviceImageFor. Запазено за съвместимост. */
export const lengthIconFor = (name: string): string | null => serviceImageFor(name);
