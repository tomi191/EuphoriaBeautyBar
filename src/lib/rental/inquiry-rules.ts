/**
 * Чистите правила на запитването от обявата «Място под наем» (без база): проверка на полетата,
 * български телефон, специалността по категорията, текстовете на известието. Текстовете са на
 * Саиф (доклад 22.11.2026 «обява-запитване-и-наем», части 5 и 6), без обещан срок за отговор.
 */
import { KIND_BY_SLUG } from "@/lib/booking/kind";

/** Колко време пазим запитването (решение 16: 6 месеца). */
export const INQUIRY_RETENTION_MONTHS = 6;
/** Ограничение на честотата: най-много толкова запитвания за един час. */
export const INQUIRY_RATE_WINDOW_MIN = 60;
export const INQUIRY_MAX_PER_PHONE = 3;
export const INQUIRY_MAX_PER_IP = 5;

export const INQUIRY_LIMITS = { name: 80, phone: 30, specialty: 60, message: 1000 } as const;

export const INQUIRY_COPY = {
  title: "Изпрати запитване",
  lead: "Попълни две полета и Снежана ще се свърже с теб.",
  nameLabel: "Име",
  namePlaceholder: "Мария",
  phoneLabel: "Телефон",
  phonePlaceholder: "0888 123 456",
  specialtyLabel: "Специалност",
  specialtyHint: "Идва от обявата, можеш да го смениш",
  messageLabel: "Няколко думи за теб",
  optional: "по желание",
  messagePlaceholder: "Например: завърших курс по маникюр и търся къде да започна.",
  consent: "Разрешавам на салона да пази името и телефона ми до 6 месеца, за да се свърже с мен за мястото.",
  privacyLink: "Политика за поверителност",
  submit: "Изпрати запитването",
  doneTitle: "Получихме го.",
  doneText: "Снежана ще ти се обади.",
  doneBack: "Към обявата",
  errName: "Напиши името си, за да знае Снежана към кого да се обърне.",
  errPhone: "Провери телефона: например 0888 123 456 или +359 888 123 456.",
  errConsent: "Сложи отметката, за да може Снежана да ти се обади.",
  errSend: "Запитването не тръгна. Обади се на +359 898 66 33 15 или опитай пак.",
  errFilled: "Мястото вече е заето.",
  errPhoneLimit: "От този телефон вече има запитвания. Снежана ще ти се обади.",
  errIpLimit: "Запитването не тръгна. Обади се на +359 898 66 33 15 или опитай пак след час.",
} as const;

/**
 * Български телефон → каноничен вид «+359…» или null. Приема 0888 123 456, +359 888 123 456,
 * 00359…, с интервали, тирета, точки и скоби. Мобилните (87, 88, 89, 98, 99) са с 9 цифри след
 * нулата; градските с 8 или 9.
 */
export function parseBgPhone(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length > INQUIRY_LIMITS.phone || /[^\d\s()+.\-]/.test(t)) return null;
  let d = t.replace(/[\s().\-]/g, "");
  if (d.startsWith("+359")) d = d.slice(4);
  else if (d.startsWith("00359")) d = d.slice(5);
  else if (d.startsWith("359") && d.length >= 11) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  else return null;
  if (!/^[2-9]\d{7,8}$/.test(d)) return null;
  if (/^(8[7-9]|9[89])/.test(d) && d.length !== 9) return null;
  return `+359${d}`;
}

/** «+359888123456» → «0888 123 456» (за известието и администрацията). */
export function formatBgPhone(canonical: string): string {
  const n = canonical.replace(/^\+359/, "");
  if (n.length === 9) return `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  if (n.length === 8) return `0${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
  return canonical;
}

const SPECIALTY_BY_KIND: Record<string, string> = { nails: "Маникюр", cosmetics: "Козметика", hair: "Коса" };

/** «Специалност», попълнена от обявата по категорията; непозната → празно. */
export function specialtyForCategory(categorySlug: string | null | undefined): string {
  return (categorySlug && SPECIALTY_BY_KIND[KIND_BY_SLUG[categorySlug] ?? ""]) || "";
}

export interface InquiryFields {
  name: string;
  phone: string;
  specialty: string;
  message: string;
  consent: boolean;
}

export type InquiryFieldErrors = Partial<Record<"name" | "phone" | "consent", string>>;

export interface CleanInquiry {
  name: string;
  phone: string;
  specialty: string | null;
  message: string | null;
}

/** Проверява полетата; връща чистите стойности или грешките по поле (едни и същи във формата и на сървъра). */
export function validateInquiry(
  f: InquiryFields,
): { ok: true; value: CleanInquiry } | { ok: false; errors: InquiryFieldErrors } {
  const errors: InquiryFieldErrors = {};
  const name = f.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > INQUIRY_LIMITS.name) errors.name = INQUIRY_COPY.errName;
  const phone = parseBgPhone(f.phone);
  if (!phone) errors.phone = INQUIRY_COPY.errPhone;
  if (f.consent !== true) errors.consent = INQUIRY_COPY.errConsent;
  if (Object.keys(errors).length > 0 || !phone) return { ok: false, errors };
  const specialty = f.specialty.trim().slice(0, INQUIRY_LIMITS.specialty);
  const message = f.message.trim().slice(0, INQUIRY_LIMITS.message);
  return { ok: true, value: { name, phone, specialty: specialty || null, message: message || null } };
}

/** Telegram (част 6 на Саиф): три реда, обикновен текст, без емоджи. */
export function inquiryTelegramLines(i: { position: string; name: string; phone: string; message: string | null }): string[] {
  return [
    `Запитване за място под наем: ${i.position}`,
    `${i.name} · ${formatBgPhone(i.phone)}`,
    i.message ? `„${i.message}“` : "Без съобщение.",
  ];
}

/** Камбанката в администрацията (част 6 на Саиф). */
export const INQUIRY_BELL_TITLE = "Ново запитване за място";
export function inquiryBellDetail(i: { name: string; phone: string; position: string }): string {
  return `${i.name}, ${formatBgPhone(i.phone)} · ${i.position}`;
}

/** Границата за триене: запитванията, дошли преди нея, се трият. */
export function inquiryPurgeCutoff(now: Date): Date {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - INQUIRY_RETENTION_MONTHS);
  return d;
}
