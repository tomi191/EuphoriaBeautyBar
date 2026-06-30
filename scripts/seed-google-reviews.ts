/* eslint-disable no-console */
/**
 * Seed на реалните Google отзиви от профила на Euphoria Hair & Beauty Bar.
 * Данните са извлечени 1:1 от Google профила (place_id ChIJAadCMDVVpEAR15dn6Gh-2U4)
 * на 30.06.2026 — 43 отзива, среден рейтинг 4,8. Тук влизат 24-те С ТЕКСТ
 * (визуализируеми); отзивите само със звезди и непубликуваните се пропускат,
 * но реалният общ брой/рейтинг се пази в site_settings за header-а.
 *
 * Idempotent: трие предишните "scrape-" записи и вмъква наново. Ръчните
 * ("manual-") и OAuth ("sync-") НЕ се пипат. Бъдещ Google OAuth sync ще замени
 * тези "scrape-" с официалните (с реални аватари) — затова префиксът е "scrape-".
 *
 * npx tsx --env-file=.env.local scripts/seed-google-reviews.ts
 */
import { eq, like } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, schema } from "../src/lib/db";

// Реален среден рейтинг и общ брой отзиви от Google (вкл. тези само със звезди).
const SUMMARY = { rating: 4.8, total: 43 };
const PLACE_URL = "https://www.google.com/maps/place/?q=place_id:ChIJAadCMDVVpEAR15dn6Gh-2U4";

/** Приблизителна дата от „преди N дни" (Google показва само relative — точният ден е без значение). */
function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

interface Seed {
  name: string;
  rating: number;
  days: number; // ~преди колко дни (2 г ≈ 730, 11 мес ≈ 334, 6 мес ≈ 182)
  text: string;
}

// 1:1 текстове от Google профила (запазени с оригиналната пунктуация и емоджи).
const REVIEWS: Seed[] = [
  {
    name: "Desislava Nikolova",
    rating: 5,
    days: 182,
    text: 'Благодаря на Снежи, тя съживи косата ми, вече е жива и възстановена, професионалист, работи с хубави и щадящи продукти, приложи върху мен чудесен „водопад от кичури", харесвам косата си. Препоръчвам салона, чисто, стилно, всички са любезни, прекрасна, релаксираща обстановка, всяка дама заслужава да си подари подобни мигове..... :)',
  },
  {
    name: "Hristina Laleva",
    rating: 5,
    days: 730,
    text: "Повече от 15 години моята коса е в ръцете на Снежи, за което съм безкрайно благодарна! Посетете и вижте по-добрата визия на себе си. Изключителни професионалисти! Силно препоръчвам, особено на хората които ценят времето си - организацията е по швейцарски часовник! Благодаря и успех на целия екип!",
  },
  {
    name: "Desislava Kasova",
    rating: 5,
    days: 731,
    text: "Неповторима професионална грижа за моята коса, 18+ години, прекрасен нов hair & beauty bar, уютната и стилна обстановка, допринасят още повече да се поглезиш :)",
  },
  {
    name: "Вяра Терзиева",
    rating: 5,
    days: 334,
    text: "Страхотни услуги и грижа за моята коса. Доволна съм, че се доверих на Снежи. Препоръчвам с две ръце!",
  },
  {
    name: "Nadya Pancheva",
    rating: 5,
    days: 732,
    text: "Снежи е моят фризьор от години. Постоянен клиент съм, защото винаги съм посрещана с внимание, усмивка и винаги съм получавала качествена услуга. При специални поводи част от доброто ми самочувствие е било заради прическите на Снежи! Благодарности и пожелания за успехи и още безброй доволни клиенти!",
  },
  {
    name: "Ivelina Dimitrova",
    rating: 5,
    days: 733,
    text: "Прекрасен професионалист е Снежито ❤️ Винаги има усет за симетрия и какво трябва да сътвори, дори да нарисува върху косата ми. С търпението и невероятен такт който притежава, си тръгвам красива, разбрана и усмихната. Благодаря! Бог да закриля теб и прекрасния ви екип ❤️",
  },
  {
    name: "Preslava Ganeva",
    rating: 5,
    days: 734,
    text: "Екипът е професионален и изключително учтив. Обслужването беше на високо ниво, атмосферата е релаксираща, и резултатът е безупречен. Горещо препоръчвам този салон за всички, които искат да се почувстват страхотно и да изглеждат невероятно!",
  },
  {
    name: "Galina Dimova",
    rating: 5,
    days: 735,
    text: "Винаги топло посрещане с усмивка! Снежи полага отлични грижи за външния вид на клиентите си и дава отлични професионални съвети.",
  },
  {
    name: "Aylyan Ilyaz",
    rating: 5,
    days: 736,
    text: "Много съм доволна от услугите, които предоставя фризьорката Снежи. Работи бързо и винаги получавам това, което искам като подстрижка и прическа!",
  },
  {
    name: "Пепи Петров",
    rating: 5,
    days: 737,
    text: "Отлично обслужване в този фризьорски салон! Екипът е професионален и внимателен. Моята коса изглеждаше невероятно след посещението ми. Чисто и модерно обзаведено място. Препоръчвам горещо!",
  },
  {
    name: "Petia Savova",
    rating: 5,
    days: 738,
    text: "Снежана е пълен професионалист! Точна, коректна, креативна! Салонът е стилен, красив, уютен и много чист! Препоръчвам!",
  },
  {
    name: "Дони Железова",
    rating: 5,
    days: 739,
    text: "Любимият ми салон. Стилно, уютно, релаксиращо и приятно е посещението там. Отлично и професионално обслужване и качество. Продължавайте все така.",
  },
  {
    name: "megi ganeva",
    rating: 5,
    days: 740,
    text: "Прекрасно място с прекрасна Снежи. Професионално и топло обслужване. Благодаря!",
  },
  {
    name: "Veselka Doycheva",
    rating: 5,
    days: 741,
    text: "Прекрасно обслужване, винаги усмихнати и любезни! Професионализъм и качество на работа на високо ниво!",
  },
  {
    name: "IBC Varna",
    rating: 5,
    days: 742,
    text: "Прекрасна Снежи, много добра, усмихната, позитивна и най-важно страхотен професионалист!!!",
  },
  {
    name: "Sophie Borissoff",
    rating: 5,
    days: 743,
    text: "Изключителни професионалисти! Услуги на високо ниво! Чувствам се прекрасно в ръцете им!",
  },
  {
    name: "Kristina Petrova",
    rating: 5,
    days: 744,
    text: "Професионализъм, добро отношение, коректност и зареждане с позитивна енергия.",
  },
  {
    name: "Desislava Yordanova",
    rating: 5,
    days: 745,
    text: "Най-доброто студио! Снежи е уникална! Благодарим! ❤️",
  },
  {
    name: "Eli Andreeva",
    rating: 5,
    days: 746,
    text: "Много уютна обстановка, отлично обслужване и приятни професионалисти - фризьор и маникюрист.",
  },
  {
    name: "Jana Kirova",
    rating: 5,
    days: 747,
    text: "Невероятен професионалист, винаги отлични резултати!",
  },
  {
    name: "Ina Kolarova",
    rating: 5,
    days: 748,
    text: "Професионално обслужване, иновативен стилист!",
  },
  {
    name: "Polina Marinova",
    rating: 5,
    days: 749,
    text: "Страхотно обслужване, винаги мили и усмихнати.",
  },
  {
    name: "Silviya Cholakova",
    rating: 5,
    days: 750,
    text: "Препоръчвам! Истински професионалисти!",
  },
  {
    name: "Анастасия Стоева",
    rating: 5,
    days: 751,
    text: "Отличен фризьор ❤️",
  },
];

async function main() {
  console.log(`Seed на ${REVIEWS.length} реални Google отзива (от ${SUMMARY.total} общо, рейтинг ${SUMMARY.rating})…`);

  await db.transaction(async (tx) => {
    // Трие само предишния scrape (пази manual/ sync).
    await tx.delete(schema.googleReviews).where(like(schema.googleReviews.id, "scrape-%"));
    for (const r of REVIEWS) {
      await tx.insert(schema.googleReviews).values({
        id: `scrape-${nanoid()}`,
        authorName: r.name,
        authorPhoto: null,
        rating: r.rating,
        text: r.text,
        language: "bg",
        publishedAt: daysAgo(r.days),
        fetchedAt: new Date(),
      });
    }
  });

  // Реален summary за header-а (брой/рейтинг от целия профил, не само визуализираните).
  const summaryValue = { ...SUMMARY, placeUrl: PLACE_URL, fetchedAt: new Date().toISOString() };
  const existing = await db.query.siteSettings.findFirst({
    where: (s, { eq: e }) => e(s.key, "google_reviews_summary"),
  });
  if (existing) {
    await db
      .update(schema.siteSettings)
      .set({ value: summaryValue, updatedAt: new Date() })
      .where(eq(schema.siteSettings.key, "google_reviews_summary"));
  } else {
    await db.insert(schema.siteSettings).values({ key: "google_reviews_summary", value: summaryValue, updatedAt: new Date() });
  }

  const count = await db.query.googleReviews.findMany();
  console.log(`✓ Готово. В базата: ${count.length} отзива. Summary: ${SUMMARY.rating}★ / ${SUMMARY.total} общо.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
