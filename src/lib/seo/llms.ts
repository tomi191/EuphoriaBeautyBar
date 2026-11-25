import { siteConfig } from "@/lib/site";
import { getFaqItems } from "@/lib/data/faq-db";
import { SERVICE_FAQ, SERVICE_INTRO } from "@/lib/data/service-faq";
import { fillBooking } from "@/lib/seo/booking-copy";
import { getServiceCatalog } from "@/lib/data/service-catalog";
import { getPublishedPosts } from "@/lib/data/blog-store";
import type { ServiceCategory, ServiceItem } from "@/lib/data/services";
import { db } from "@/lib/db";
import { formatAmount, formatEuro } from "@/lib/booking/price";
import { loadRunningCampaigns, type PublicCampaign } from "@/lib/campaigns/public";
import { longDay } from "@/lib/campaigns/rules";

/**
 * Генератори за /llms.txt (компактен индекс) и /llms-full.txt (пълен fact sheet).
 * Живеят като route handlers (не статичен public/ файл), за да теглят ценоразписа
 * от DB каталога — цените НИКОГА не остаряват спрямо admin промени.
 * Формат: llmstxt.org — H1 + blockquote резюме + секции.
 */

const BOOKING_URL = `${siteConfig.url}/zapazi-chas`;

function formatPrice(i: ServiceItem): string {
  const cur = i.currency === "€" ? "€" : "лв";
  let p = i.priceMax && i.priceMax > i.price ? `${formatAmount(i.price)}–${formatAmount(i.priceMax)} ${cur}` : `${formatAmount(i.price)} ${cur}`;
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
    `- **Плащане:** в брой, с карта или през Revolut, на място в салона (няма онлайн плащане и депозит при запазване)`,
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
/** Течащите промоции (№11); при грешка файлът е без тях, не пада. */
async function runningPromos(): Promise<PublicCampaign[]> {
  try {
    return await loadRunningCampaigns();
  } catch {
    return [];
  }
}

/** Ред за llms-full.txt с двете цени по чл. 64 ЗЗП (Саиф 2.17): «нова цена …, предишна цена …». */
function promoLine(c: PublicCampaign): string {
  const until = `до ${longDay(c.endsOn)} включително`;
  return c.services
    .map((s) =>
      c.kind === "discount" && s.newEur != null && s.prevEur != null
        ? `- ${s.name} ${c.card.who}: нова цена ${formatEuro(s.newEur)}, предишна цена ${formatEuro(s.prevEur)}; ${until}.`
        : `- ${s.name} ${c.card.who}: цена ${s.priceFrom ? "от " : ""}${s.regularEur != null ? formatEuro(s.regularEur) : ""}, подарък в същия час: ${c.card.gift ?? ""}; ${until}.`,
    )
    .join("\n");
}

export async function renderLlmsTxt(): Promise<string> {
  // Блогът е от БД; при грешка llms.txt не трябва да пада → празен списък.
  const posts = await getPublishedPosts().catch(() => []);
  const promos = await runningPromos();
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
    return `- [${c.title}](${siteConfig.url}/uslugi/${c.slug}): ${c.description} Цени от ${formatAmount(min)} ${cur}, ${items.length} услуги.`;
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
    "## Специализирани страници (с цени на живо и FAQ)",
    "",
    `- [Балаяж във Варна](${siteConfig.url}/uslugi/balayazh-varna): ръчно изсветляване с мек преход (среща се и изписано „балеаж“) — какво е, колко издържа, цени`,
    `- [Боядисване на коса във Варна](${siteConfig.url}/uslugi/boyadisvane-na-kosa-varna): боядисване и корекция на цвят, цени по дължина`,
    `- [Кичури във Варна](${siteConfig.url}/uslugi/kichuri-varna): кичури на фолио, цени по дължина, кичури или балаяж`,
    `- [Почистване на лице във Варна](${siteConfig.url}/uslugi/pochistvane-na-litse-varna): ултразвуково, комбинирано, Hydrafacial, медицинско (Acnon)`,
    `- [Кола маска във Варна](${siteConfig.url}/uslugi/kola-maska-varna): епилация с восък, цени по зони`,
    `- [Вежди и мигли във Варна](${siteConfig.url}/uslugi/vezhdi-i-migli-varna): оформяне, боядисване и ламиниране`,
    `- [Салон в кв. Левски](${siteConfig.url}/salon-varna-levski): локация, паркиране, работно време, FAQ за квартала`,
    "",
    // Журналът е единственото, което реално ранкира (статията за балеаж е #1), а AI
    // търсачките цитират страници, които виждат в llms.txt → изброяваме публикуваните.
    ...(posts.length
      ? [
          "## Журнал (статии от салона)",
          "",
          ...posts.map((p) => `- [${p.title}](${siteConfig.url}/blog/${p.slug})${p.excerpt ? `: ${p.excerpt}` : ""}`),
          "",
        ]
      : []),
    ...(promos.length
      ? ["## Промоции", "", `- [Промоции в салона](${siteConfig.url}/promotsii): ${promos.length === 1 ? "1 промоция тече сега" : `${promos.length} промоции текат сега`}; услуга, специалист, цена преди и сега, дата на края`, ""]
      : []),
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

const catOnline = (c: ServiceCategory) => c.groups.some((g) => g.items.some((i) => i.online));

/** Пълен /llms-full.txt — целият жив ценоразпис + FAQ + локално инфо. */
export async function renderLlmsFullTxt(): Promise<string> {
  let catalog: ServiceCategory[] = [];
  try {
    catalog = await getServiceCatalog();
  } catch {
    // DB недостъпна → файлът пак е валиден, без ценоразписа.
  }
  const rating = await reviewsLine();
  const promos = await runningPromos();

  const catalogBlocks = catalog.map((c) => {
    // {book:онлайн|телефон} (решение 43): като на страницата на категорията.
    const intro = fillBooking((SERVICE_INTRO[c.slug] ?? []).join(" "), catOnline(c));
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

  const serviceFaq = catalog.flatMap((c) =>
    (SERVICE_FAQ[c.slug] ?? []).map((f) => ({ ...f, answer: fillBooking(f.answer, catOnline(c)) })),
  );
  const allFaq = [...(await getFaqItems()), ...serviceFaq].map((f) => `**${f.question}**\n${f.answer}`);

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
    ...(promos.length ? ["## Промоции", "", `Страницата: ${siteConfig.url}/promotsii`, "", ...promos.map(promoLine), ""] : []),
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
