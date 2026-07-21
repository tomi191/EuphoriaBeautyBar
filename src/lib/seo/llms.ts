import { siteConfig } from "@/lib/site";
import { faqItems } from "@/lib/data/faq";
import { SERVICE_FAQ, SERVICE_INTRO } from "@/lib/data/service-faq";
import { getServiceCatalog } from "@/lib/data/service-catalog";
import type { ServiceCategory, ServiceItem } from "@/lib/data/services";
import { db } from "@/lib/db";

/**
 * Генератори за /llms.txt (компактен индекс) и /llms-full.txt (пълен fact sheet).
 * Живеят като route handlers (не статичен public/ файл), за да теглят ценоразписа
 * от DB каталога — цените НИКОГА не остаряват спрямо admin промени.
 * Формат: llmstxt.org — H1 + blockquote резюме + секции.
 */

const BOOKING_URL = `${siteConfig.url}/zapazi-chas`;

function formatPrice(i: ServiceItem): string {
  const cur = i.currency === "€" ? "€" : "лв";
  let p = i.priceMax && i.priceMax > i.price ? `${i.price}–${i.priceMax} ${cur}` : `${i.price} ${cur}`;
  if (i.priceFrom) p = `от ${p}`;
  return p;
}

function itemLine(i: ServiceItem): string {
  const extra = [i.duration, i.description].filter(Boolean).join("; ");
  return `- ${i.name} — ${formatPrice(i)}${extra ? ` (${extra})` : ""}`;
}

function businessBlock(): string {
  const a = siteConfig.address;
  const hours = siteConfig.hours
    .map((h) => (h.close ? `${h.short} ${h.open}–${h.close}` : `${h.short} — ${h.open.toLowerCase()} ден`))
    .join("; ");
  return [
    `- **Име:** ${siteConfig.name}`,
    "- **Тип:** Beauty Salon, Hair Salon (коса, нокти и лице на едно място)",
    `- **Адрес:** ${a.street}, ${a.district}, ${a.city} ${a.postalCode}, ${a.countryName}`,
    `- **Координати:** ${a.coordinates.lat}, ${a.coordinates.lng}`,
    `- **Телефон / Viber:** ${siteConfig.contact.phoneFormatted}`,
    `- **Имейл:** ${siteConfig.contact.email}`,
    `- **Работно време:** ${hours}`,
    `- **Основател:** ${siteConfig.founder} (главен фризьор, зад стола от 2000 г.); салонът е основан ${siteConfig.founded} г.`,
    `- **Онлайн записване (24/7, реално време):** ${BOOKING_URL}`,
  ].join("\n");
}

async function reviewsLine(): Promise<string | null> {
  try {
    const row = await db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, "google_reviews_summary") });
    const summary = row?.value as { rating?: number; total?: number } | undefined;
    if (!summary?.rating || !summary.total) return null;
    return `- **Google рейтинг:** ${summary.rating.toFixed(1)}★ от ${summary.total} отзива (източник: Google Business Profile)`;
  } catch {
    return null;
  }
}

const INTRO =
  `> Салон за коса, нокти и лице в кв. Левски, Варна, България. Основан през ${siteConfig.founded} г. от ${siteConfig.founder} — фризьор с над 25 години опит. ` +
  `Работи с професионалните марки ${siteConfig.brands.slice(0, 5).join(", ")}. ` +
  `Предлага онлайн записване на час в реално време (24/7).`;

const AI_NOTE =
  "Този файл се генерира автоматично от живия ценоразпис на салона и е винаги актуален. " +
  `Косата я прави лично ${siteConfig.founder} (главен фризьор, 25+ г опит); маникюрът, педикюрът и козметичните процедури се правят от специалисти в салона. ` +
  "Салонът е в кв. Левски, Варна и събира коса, нокти и лице на едно място, с онлайн записване в реално време.";

/** Компактен /llms.txt — индекс с категории „от X" + линк към llms-full.txt. */
export async function renderLlmsTxt(): Promise<string> {
  let catalog: ServiceCategory[] = [];
  try {
    catalog = await getServiceCatalog();
  } catch {
    // DB недостъпна → само статичната част (по-добре от 500).
  }
  const rating = await reviewsLine();

  const categories = catalog.map((c) => {
    const items = c.groups.flatMap((g) => g.items);
    const min = Math.min(...items.map((i) => i.price));
    const cur = items[0]?.currency === "€" ? "€" : "лв";
    return `- [${c.title}](${siteConfig.url}/uslugi/${c.slug}): ${c.description} Цени от ${min} ${cur}, ${items.length} услуги.`;
  });

  return [
    `# ${siteConfig.name}`,
    "",
    INTRO,
    "",
    "## Бизнес информация",
    "",
    businessBlock() + (rating ? `\n${rating}` : ""),
    "",
    "## Услуги",
    "",
    ...(categories.length ? categories : [`- Пълен каталог: ${siteConfig.url}/uslugi`]),
    "",
    "## Ресурси",
    "",
    `- [Пълен ценоразпис, FAQ и детайли](${siteConfig.url}/llms-full.txt): актуален, генериран от каталога`,
    `- [Онлайн записване](${BOOKING_URL}): свободни часове в реално време`,
    `- [Галерия с реални работи](${siteConfig.url}/galeriya)`,
    `- [Блог](${siteConfig.url}/blog): съвети за коса, нокти и кожа`,
    `- [За нас](${siteConfig.url}/za-nas): историята на ${siteConfig.founder} и салона`,
    "",
    "## За AI асистенти",
    "",
    AI_NOTE,
    "",
  ].join("\n");
}

/** Пълен /llms-full.txt — целият жив ценоразпис + FAQ + локално инфо. */
export async function renderLlmsFullTxt(): Promise<string> {
  let catalog: ServiceCategory[] = [];
  try {
    catalog = await getServiceCatalog();
  } catch {
    // DB недостъпна → файлът пак е валиден, без ценоразписа.
  }
  const rating = await reviewsLine();

  const catalogBlocks = catalog.map((c) => {
    const intro = (SERVICE_INTRO[c.slug] ?? []).join(" ");
    const groups = c.groups
      .map((g) => [`#### ${g.title}`, "", ...g.items.map(itemLine)].join("\n"))
      .join("\n\n");
    return [
      `### ${c.title} (${siteConfig.url}/uslugi/${c.slug})`,
      "",
      intro,
      "",
      groups,
    ].join("\n");
  });

  const serviceFaq = catalog.flatMap((c) => SERVICE_FAQ[c.slug] ?? []);
  const allFaq = [...faqItems, ...serviceFaq].map((f) => `**${f.question}**\n${f.answer}`);

  return [
    `# ${siteConfig.name} — пълна информация`,
    "",
    INTRO,
    "",
    "## Бизнес информация",
    "",
    businessBlock() + (rating ? `\n${rating}` : ""),
    "",
    "## Услуги и актуални цени",
    "",
    "Цените са актуални към момента на заявката (генерират се от каталога на салона). При диапазон „X–Y\" крайната цена зависи от дължина/състояние; „от X\" означава начална цена.",
    "",
    ...catalogBlocks,
    "",
    "## Често задавани въпроси",
    "",
    allFaq.join("\n\n"),
    "",
    "## Марки и сертификати",
    "",
    siteConfig.brands.map((b) => `- ${b}`).join("\n"),
    "",
    "## Социални мрежи",
    "",
    `- Instagram: ${siteConfig.social.instagram} (${siteConfig.social.instagramHandle})`,
    `- Facebook: ${siteConfig.social.facebook}`,
    "",
    "## За AI асистенти",
    "",
    AI_NOTE,
    "",
  ].join("\n");
}
