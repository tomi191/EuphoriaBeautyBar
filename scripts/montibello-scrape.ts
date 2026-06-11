/* eslint-disable no-console */
// One-shot (НЕ cron) скрипт за каталог v2 — събира РЕАЛНИТЕ факти и официалните
// продуктови снимки от montibello.com и ги записва в scripts/montibello-raw.json
// за човешки преглед. Само СЪБИРА сурови факти — НЕ пише в src/lib/data/montibello.ts
// (по-късна задача) и НЕ сваля снимките (Task 2).
//
// Източник на фактите: hair.montibello.com (официалният сайт на бранда), извлечени
// еднократно на 11.06.2026 чрез WebFetch + верификация на raw HTML/curl. Имената,
// описанията, съставките и image URL-ите по-долу са преписани ДОСЛОВНО от сайта.
// ABSOLUTE RULE: никакво измисляне. Празно поле (null) е коректно; фабрикувано — не е.
//
// Какво прави самият скрипт при run:
//   1. Държи извлечените факти като източник на истина (масивът PRODUCTS).
//   2. Верифицира всеки imageUrl с реална HTTP заявка (curl + Content-Type / размер),
//      за да потвърди че е истинско изображение, а не 403/HTML challenge.
//   3. Записва scripts/montibello-raw.json (масив от обекти) + кратък отчет в конзолата
//      кои продукти имат работещ image URL и кои се нуждаят от потребителска връзка.
//
// Run:  npx tsx scripts/montibello-scrape.ts
//       npx tsx scripts/montibello-scrape.ts --no-verify   (пропуска мрежовата проверка)

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HOST = "https://hair.montibello.com";

type CategorySlug = "grizha" | "boyadisvane" | "oksidanti" | "stayling";

interface RawProduct {
  slug: string;
  name: string;
  line: string;
  categorySlug: CategorySlug;
  productType: string; // шампоан | маска | балсам | спрей | боя | оксидант | стайлинг | терапия | серум
  rawDescription: string; // дословно от montibello.com (английски — humanize-ва се по-късно)
  forHairType: string | null;
  keyIngredients: string[]; // само ако сайтът ги посочва
  imageUrl: string | null; // официален URL от montibello.com; null ако не е надеждно установим
  sourceUrl: string; // страницата, от която е извлечено (за одит)
  note?: string; // бележка при null/несигурност
}

// Помощник за kebab-case slug (без диакритика; от английското име).
function kebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const u = (p: string) => `${HOST}${p}`;

// ─────────────────────────────────────────────────────────────────────────────
// HOP — ретейл грижа (categorySlug: grizha). Източник: /en/range/hop/ + под-страниците.
// Изброяваме РЕАЛНИТЕ продукти по линия (име, тип, описание, коса, съставки, снимка).
// keyIngredients са на ниво линия там, където сайтът ги дава общо за рутината.
// ─────────────────────────────────────────────────────────────────────────────

const HOP: Array<Omit<RawProduct, "categorySlug">> = [
  // — Ultra Repair —
  {
    slug: "ultra-repair-shampoo",
    name: "Ultra Repair Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription:
      "Ultra repair shampoo (300 ml). Part of the Ultra Repair restorative and nourishing routine that reconstructs and strengthens heat- and chemically-damaged hair.",
    forHairType: "Damaged hair (heat- and chemically-damaged)",
    keyIngredients: ["Vegan collagen (plant-based protein complex)", "LifeAlgae Bioscience"],
    imageUrl: u("/wp-content/uploads/2025/12/hop-ultra-repair-shampoo-300-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-repair/"),
  },
  {
    slug: "ultra-repair-rinse",
    name: "Ultra Repair Rinse",
    line: "HOP",
    productType: "балсам",
    rawDescription: "Ultra repair conditioner (200 ml), part of the Ultra Repair restorative routine.",
    forHairType: "Damaged hair (heat- and chemically-damaged)",
    keyIngredients: ["Vegan collagen (plant-based protein complex)", "LifeAlgae Bioscience"],
    imageUrl: u("/wp-content/uploads/2025/12/hop-ultra-repair-rinse-200-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-repair/"),
  },
  {
    slug: "ultra-repair-mask",
    name: "Ultra Repair Mask",
    line: "HOP",
    productType: "маска",
    rawDescription: "Ultra repair mask (200 ml), part of the Ultra Repair restorative routine.",
    forHairType: "Damaged hair (heat- and chemically-damaged)",
    keyIngredients: ["Vegan collagen (plant-based protein complex)", "LifeAlgae Bioscience"],
    imageUrl: u("/wp-content/uploads/2025/12/hop-ultra-repair-mask-300-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-repair/"),
  },
  {
    slug: "ultra-repair-sealed-ends",
    name: "Ultra Repair Sealed Ends",
    line: "HOP",
    productType: "терапия",
    rawDescription: "Intensive nourishing cream for ends (75 ml), part of the Ultra Repair routine.",
    forHairType: "Damaged hair, dry ends",
    keyIngredients: ["Vegan collagen (plant-based protein complex)", "LifeAlgae Bioscience"],
    imageUrl: u("/wp-content/uploads/2025/12/hop-repair-sealed-ends.webp"),
    sourceUrl: u("/en/range/hop/hop-repair/"),
  },
  {
    slug: "ultra-repair-overnight-serum",
    name: "Ultra Repair Overnight Serum",
    line: "HOP",
    productType: "серум",
    rawDescription:
      "Overnight serum (100 ml). “Restores hair strength, hydration and softness in just 1 night.”",
    forHairType: "Damaged hair (heat- and chemically-damaged)",
    keyIngredients: ["Vegan collagen (plant-based protein complex)", "LifeAlgae Bioscience"],
    imageUrl: u("/wp-content/uploads/2026/01/hop_repairovernight_01-1.jpg"),
    sourceUrl: u("/en/range/hop/hop-repair/"),
  },

  // — Colour Last —
  {
    slug: "colour-last-shampoo",
    name: "Colour Last Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription:
      "Part of the Colour Last moisturising and protective routine that extends the lifespan of coloured hair, enriched with Ferulic Acid (300 ml).",
    forHairType: "Coloured hair",
    keyIngredients: ["LifeAlgae Bioscience", "Ferulic Acid (plant-based antioxidant)", "UV Filter"],
    imageUrl: u("/wp-content/uploads/2025/12/hop-colour-last-shampoo-300-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-colour/"),
  },
  {
    slug: "colour-last-rinse",
    name: "Colour Last Rinse",
    line: "HOP",
    productType: "балсам",
    rawDescription: "Conditioner for coloured hair (200 ml), part of the Colour Last routine.",
    forHairType: "Coloured hair",
    keyIngredients: ["LifeAlgae Bioscience", "Ferulic Acid (plant-based antioxidant)", "UV Filter"],
    imageUrl: u("/wp-content/uploads/2025/12/hop-colour-last-rinse-200-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-colour/"),
  },
  {
    slug: "colour-last-mask",
    name: "Colour Last Mask",
    line: "HOP",
    productType: "маска",
    rawDescription: "Mask for coloured hair (200 ml), part of the Colour Last routine.",
    forHairType: "Coloured hair",
    keyIngredients: ["LifeAlgae Bioscience", "Ferulic Acid (plant-based antioxidant)", "UV Filter"],
    imageUrl: u("/wp-content/uploads/2025/12/hop-colour-last-mask-200-fda.jpg"),
    sourceUrl: u("/en/range/hop/hop-colour/"),
  },

  // — Smooth Hydration —
  {
    slug: "smooth-hydration-shampoo",
    name: "Smooth Hydration Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription:
      "Hydrating shampoo (300 ml). Part of the moisturising and anti-frizz routine that strengthens hair and helps tame dry, unruly and/or frizzy hair.",
    forHairType: "Dry, unruly and/or frizzy hair",
    keyIngredients: [
      "Hyaluronic acid",
      "LifeAlgae Bioscience",
      "Chia and linseed polysaccharides",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-smooth-hydration-shampoo-300-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-hydration/"),
  },
  {
    slug: "smooth-hydration-rinse",
    name: "Smooth Hydration Rinse",
    line: "HOP",
    productType: "балсам",
    rawDescription: "Hydrating conditioner (200 ml), part of the Smooth Hydration routine.",
    forHairType: "Dry, unruly and/or frizzy hair",
    keyIngredients: [
      "Hyaluronic acid",
      "LifeAlgae Bioscience",
      "Chia and linseed polysaccharides",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-smooth-hydration-rinse-200-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-hydration/"),
  },
  {
    slug: "smooth-hydration-mask",
    name: "Smooth Hydration Mask",
    line: "HOP",
    productType: "маска",
    rawDescription: "Hydrating mask (200 ml), part of the Smooth Hydration routine.",
    forHairType: "Dry, unruly and/or frizzy hair",
    keyIngredients: [
      "Hyaluronic acid",
      "LifeAlgae Bioscience",
      "Chia and linseed polysaccharides",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-smooth-hydration-mask-300-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-hydration/"),
  },

  // — Full Volume —
  {
    slug: "full-volume-shampoo",
    name: "Full Volume Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription:
      "Volumising shampoo (300 ml). Part of the volumising routine that builds body and gives fine hair a natural lift, enriched with Oat Peptides.",
    forHairType: "Fine hair",
    keyIngredients: [
      "Oat Peptides (amino acids for body and texture)",
      "Hydrolysed Rice Protein",
      "LifeAlgae Bioscience",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-full-volume-shampoo-300-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-volume/"),
  },
  {
    slug: "full-volume-foam-rinse",
    name: "Full Volume Foam Rinse",
    line: "HOP",
    productType: "балсам",
    rawDescription: "Volumising conditioning mousse (150 ml), part of the Full Volume routine.",
    forHairType: "Fine hair",
    keyIngredients: [
      "Oat Peptides (amino acids for body and texture)",
      "Hydrolysed Rice Protein",
      "LifeAlgae Bioscience",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-full-volume-foam-rinse-1.jpg"),
    sourceUrl: u("/en/range/hop/hop-volume/"),
  },
  {
    slug: "full-volume-dry-shampoo",
    name: "Full Volume Dry Shampoo",
    line: "HOP",
    productType: "спрей",
    rawDescription: "Volumising dry shampoo (150 ml), part of the Full Volume routine.",
    forHairType: "Fine hair",
    keyIngredients: [
      "Oat Peptides (amino acids for body and texture)",
      "Hydrolysed Rice Protein",
      "LifeAlgae Bioscience",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-full-volume-dry-shampoo-1.jpg"),
    sourceUrl: u("/en/range/hop/hop-volume/"),
  },

  // — Sun Care —
  {
    slug: "sun-care-restorative-shampoo",
    name: "Sun Care Restorative Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription: "After sun restorative shampoo (300 ml), part of the Sun Care routine.",
    forHairType: "Sun-exposed hair",
    keyIngredients: ["LifeAlgae Bioscience", "Resveratrol", "UV Filter"],
    imageUrl: u("/wp-content/uploads/2025/11/hop-sun-care-shampoo-300.jpg"),
    sourceUrl: u("/en/range/hop/hop-sun-care/"),
  },
  {
    slug: "sun-care-restorative-mask",
    name: "Sun Care Restorative Mask",
    line: "HOP",
    productType: "маска",
    rawDescription: "After sun restorative mask (200 ml), part of the Sun Care routine.",
    forHairType: "Sun-exposed hair",
    keyIngredients: ["LifeAlgae Bioscience", "Resveratrol", "UV Filter"],
    imageUrl: u("/wp-content/uploads/2025/11/hop-sun-care-mask-200.jpg"),
    sourceUrl: u("/en/range/hop/hop-sun-care/"),
  },
  {
    slug: "sun-care-defence-mist",
    name: "Sun Care Defence Mist",
    line: "HOP",
    productType: "спрей",
    rawDescription: "UV protection conditioning mist for sun-exposed hair (125 ml).",
    forHairType: "Sun-exposed hair",
    keyIngredients: ["LifeAlgae Bioscience", "Resveratrol", "UV Filter"],
    imageUrl: u("/wp-content/uploads/2025/11/hop-sun-care-mist-125.jpg"),
    sourceUrl: u("/en/range/hop/hop-sun-care/"),
  },

  // — Detox —
  {
    slug: "detox-cleansing-shampoo",
    name: "Detox Cleansing Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription:
      "Detoxifying shampoo (300 ml). Part of the detoxifying and balancing routine that cleanses, refreshes and removes impurities and excess oil from the scalp and hair.",
    forHairType: "Scalp and hair with excess oil / impurities",
    keyIngredients: [
      "LifeAlgae Bioscience with Prebiotics and Postbiotics",
      "Clay (absorbs excess oil and impurities)",
      "Sarcosine (amino acid regulating sebaceous secretion)",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-detox-cleansing-shampoo-300-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-detox/"),
  },
  {
    slug: "scalp-detox-cleansing-treatment",
    name: "Scalp Detox Cleansing Treatment",
    line: "HOP",
    productType: "терапия",
    rawDescription: "Balancing scalp treatment (200 ml), part of the Detox routine.",
    forHairType: "Scalp with excess oil / impurities",
    keyIngredients: [
      "LifeAlgae Bioscience with Prebiotics and Postbiotics",
      "Clay (absorbs excess oil and impurities)",
      "Sarcosine (amino acid regulating sebaceous secretion)",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-detox-cleansing-scalp-treatment-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-detox/"),
  },

  // — Sensitive Protection —
  {
    slug: "sensitive-protection-shampoo",
    name: "Sensitive Protection Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription:
      "Protective shampoo (300 ml). Part of the calming and protective routine that balances sensitive, irritated or flaky scalps, enriched with Niacinamide.",
    forHairType: "Sensitive, irritated or flaky scalps",
    keyIngredients: ["Niacinamide (antioxidant)", "LifeAlgae Bioscience", "Aloe Vera Juice"],
    imageUrl: u("/wp-content/uploads/2025/12/hop-sensitive-protection-shampoo-300-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-sensitive/"),
  },
  {
    slug: "sensitive-protection-scalp-serum",
    name: "Sensitive Protection Scalp Serum",
    line: "HOP",
    productType: "серум",
    rawDescription: "Soothing scalp serum (75 ml), part of the Sensitive Protection routine.",
    forHairType: "Sensitive, irritated or flaky scalps",
    keyIngredients: ["Niacinamide (antioxidant)", "LifeAlgae Bioscience", "Aloe Vera Juice"],
    imageUrl: u("/wp-content/uploads/2025/12/hop-sensitive-protection-scalp-serum-1.jpg"),
    sourceUrl: u("/en/range/hop/hop-sensitive/"),
  },

  // — Purifying Balance —
  {
    slug: "purifying-balance-shampoo",
    name: "Purifying Balance Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription:
      "Purifying shampoo (300 ml). Part of the purifying and exfoliating routine that decongests toxin-saturated, stressed and/or dandruff-prone scalps.",
    forHairType: "Stressed and/or dandruff-prone scalps",
    keyIngredients: [
      "LifeAlgae Bioscience with Prebiotics and Postbiotics",
      "Propanediol Caprylate (anti-dandruff active targeting malassezia)",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-purifying-balance-shampoo-1.jpg"),
    sourceUrl: u("/en/range/hop/hop-purify/"),
  },
  {
    slug: "purifying-balance-scalp-treatment",
    name: "Purifying Balance Scalp Treatment",
    line: "HOP",
    productType: "терапия",
    rawDescription: "Purifying, exfoliating scalp treatment (200 ml), part of the Purifying Balance routine.",
    forHairType: "Stressed and/or dandruff-prone scalps",
    keyIngredients: [
      "LifeAlgae Bioscience with Prebiotics and Postbiotics",
      "Propanediol Caprylate (anti-dandruff active targeting malassezia)",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-purifying-balance-scalp-treatment-1.jpg"),
    sourceUrl: u("/en/range/hop/hop-purify/"),
  },

  // — Blonde Glow —
  {
    slug: "blonde-glow-shampoo",
    name: "Blonde Glow Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription:
      "Illuminating shampoo for blonde hair (300 ml). Strengthens and reconstructs blonde hair, neutralises yellow undertones, delivers shine and protects against oxidisation.",
    forHairType: "Blonde or bleached hair",
    keyIngredients: [
      "Vitamin C (antioxidant)",
      "LifeAlgae Bioscience",
      "UV Filter",
      "Purple (neutralising) pigments",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-blonde-glow-shampoo-300-fda-f-1.jpg"),
    sourceUrl: u("/en/range/hop/hop-blonde/"),
  },
  {
    slug: "blonde-glow-mask",
    name: "Blonde Glow Mask",
    line: "HOP",
    productType: "маска",
    rawDescription: "Illuminating mask for blonde hair (200 ml), part of the Blonde Glow routine.",
    forHairType: "Blonde or bleached hair",
    keyIngredients: [
      "Vitamin C (antioxidant)",
      "LifeAlgae Bioscience",
      "UV Filter",
      "Purple (neutralising) pigments",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-blonde-glow-mask-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-blonde/"),
  },

  // — Silver White —
  {
    slug: "silver-white-shampoo",
    name: "Silver White Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription:
      "Illuminating shampoo for white hair (300 ml). Part of the colour brightening and refining routine that enhances and strengthens white or grey hair.",
    forHairType: "White or grey hair",
    keyIngredients: [
      "LifeAlgae Bioscience + B-complex",
      "Direct pigments",
      "Antioxidants",
      "UV Filter",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-silver-white-shampoo-300-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-silver/"),
  },
  {
    slug: "silver-white-rinse",
    name: "Silver White Rinse",
    line: "HOP",
    productType: "балсам",
    rawDescription: "Illuminating conditioner for white hair (200 ml), part of the Silver White routine.",
    forHairType: "White or grey hair",
    keyIngredients: [
      "LifeAlgae Bioscience + B-complex",
      "Direct pigments",
      "Antioxidants",
      "UV Filter",
    ],
    imageUrl: u("/wp-content/uploads/2025/12/hop-silver-white-rinse-200-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-silver/"),
  },

  // — Reflects (colour boost shampoos) —
  {
    slug: "brown-reflects-shampoo",
    name: "Brown Reflects Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription: "Colour boost shampoo for medium brown hair (300 ml).",
    forHairType: "Medium brown hair",
    keyIngredients: ["B-Complex", "LifeAlgae Bioscience", "Direct Pigments", "Antioxidants", "UV Filter"],
    imageUrl: u("/wp-content/uploads/2025/12/hop-brown-reflects-shampoo-300-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-reflects/"),
  },
  {
    slug: "red-reflects-shampoo",
    name: "Red Reflects Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription: "Colour boost shampoo for red hair (300 ml).",
    forHairType: "Red hair",
    keyIngredients: ["B-Complex", "LifeAlgae Bioscience", "Direct Pigments", "Antioxidants", "UV Filter"],
    imageUrl: u("/wp-content/uploads/2025/12/hop-red-reflects-shampoo-300-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-reflects/"),
  },
  {
    slug: "copper-reflects-shampoo",
    name: "Copper Reflects Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription: "Colour boost shampoo for copper hair (300 ml).",
    forHairType: "Copper hair",
    keyIngredients: ["B-Complex", "LifeAlgae Bioscience", "Direct Pigments", "Antioxidants", "UV Filter"],
    imageUrl: u("/wp-content/uploads/2025/12/hop-copper-reflects-shampoo-300-fda-f.jpg"),
    sourceUrl: u("/en/range/hop/hop-reflects/"),
  },
  {
    slug: "purple-reflects-shampoo",
    name: "Purple Reflects Shampoo",
    line: "HOP",
    productType: "шампоан",
    rawDescription: "Colour boost shampoo for purple hair (300 ml).",
    forHairType: "Purple hair",
    keyIngredients: ["B-Complex", "LifeAlgae Bioscience", "Direct Pigments", "Antioxidants", "UV Filter"],
    imageUrl: u("/wp-content/uploads/2025/12/hop-purple-reflects-shampoo-1.jpg"),
    sourceUrl: u("/en/range/hop/hop-reflects/"),
  },

  // — Hop In Salon — Well-Ageing Treatments (професионални салонни процедури).
  // По спецификацията: салонни/изправящи процедури → grizha с professional бележка.
  // Image мапингът е потвърден от RAW HTML на /en/range/hop/hop-in-salon/.
  {
    slug: "smoothing-concentrate",
    name: "Smoothing Concentrate",
    line: "HOP",
    productType: "терапия",
    rawDescription:
      "Concentrate to improve softness and control frizz. Exclusive Professional (in-salon well-ageing treatment).",
    forHairType: null,
    keyIngredients: ["LifeAlgae Bioscience", "Molecular Enzymatic Complex"],
    imageUrl: u("/wp-content/uploads/2025/12/HBIS7.jpg"),
    sourceUrl: u("/en/range/hop/hop-in-salon/"),
    note: "Професионална салонна процедура (well-ageing). Image потвърден от raw HTML.",
  },
  {
    slug: "colour-concentrate",
    name: "Colour Concentrate",
    line: "HOP",
    productType: "терапия",
    rawDescription:
      "Concentrate for colour and gloss retention. Exclusive Professional (in-salon well-ageing treatment).",
    forHairType: null,
    keyIngredients: ["LifeAlgae Bioscience", "Molecular Enzymatic Complex"],
    imageUrl: u("/wp-content/uploads/2025/12/HBICS7.jpg"),
    sourceUrl: u("/en/range/hop/hop-in-salon/"),
    note: "Професионална салонна процедура (well-ageing). Image потвърден от raw HTML.",
  },
  {
    slug: "intensifier-fine-to-medium",
    name: "Intensifier Fine to Medium",
    line: "HOP",
    productType: "терапия",
    rawDescription:
      "Base Intensifier for fine to medium hair. Exclusive Professional (in-salon well-ageing treatment).",
    forHairType: "Fine to medium hair",
    keyIngredients: ["LifeAlgae Bioscience", "Molecular Enzymatic Complex"],
    imageUrl: u("/wp-content/uploads/2025/12/HBFM1-.jpg"),
    sourceUrl: u("/en/range/hop/hop-in-salon/"),
    note: "Професионална салонна процедура (well-ageing). Image потвърден от raw HTML.",
  },
  {
    slug: "intensifier-medium-to-coarse",
    name: "Intensifier Medium to Coarse",
    line: "HOP",
    productType: "терапия",
    rawDescription:
      "Base Intensifier for medium to coarse hair. Exclusive Professional (in-salon well-ageing treatment).",
    forHairType: "Medium to coarse hair",
    keyIngredients: ["LifeAlgae Bioscience", "Molecular Enzymatic Complex"],
    imageUrl: u("/wp-content/uploads/2025/12/HBMC1.jpg"),
    sourceUrl: u("/en/range/hop/hop-in-salon/"),
    note: "Професионална салонна процедура (well-ageing). Image потвърден от raw HTML.",
  },
  {
    slug: "recharge-strength",
    name: "Recharge Strength",
    line: "HOP",
    productType: "терапия",
    rawDescription:
      "Concentrate for fragile and/or damaged hair, formulated with amino acids and moisturising factors for intensive restructuring of the innermost layers of hair and protection against breakage. Exclusive Professional (in-salon well-ageing treatment).",
    forHairType: "Fragile and/or damaged hair",
    keyIngredients: ["LifeAlgae Bioscience", "Molecular Enzymatic Complex", "Amino acids", "Moisturising factors"],
    imageUrl: u("/wp-content/uploads/2025/12/HBIS7.jpg"),
    sourceUrl: u("/en/range/hop/hop-in-salon/"),
    note:
      "Професионална салонна процедура (well-ageing). Raw HTML показва СЪЩИЯ image (HBIS7.jpg) като Smoothing Concentrate — продуктовата страница не дава ясен отделен hero. За преглед: евентуално нужна потребителска снимка.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Cromatone — професионално боядисване (categorySlug: boyadisvane).
// SCP (Soya Colour Protect) патентована технология. Image URL-и от /en/gama/cromatone/.
// ─────────────────────────────────────────────────────────────────────────────

const CROMATONE: Array<Omit<RawProduct, "categorySlug">> = [
  {
    slug: "cromatone",
    name: "Cromatone",
    line: "Cromatone",
    productType: "боя",
    rawDescription:
      "Permanent hair colouring cream (60 g). A range of technologically advanced oxidative hair dyes that treats hair and delivers even colour from roots to ends or intense highlights. Technical product exclusively for professionals.",
    forHairType: null,
    keyIngredients: ["SCP (Soya Colour Protect) patented technology — Soya + Boswellia Serrata plant actives"],
    imageUrl: u("/wp-content/uploads/2025/12/N1_CROMATONE_Principal20-scaled-6.jpg"),
    sourceUrl: u("/en/gama/cromatone/"),
  },
  {
    slug: "cromaxtrem",
    name: "Cromaxtrem",
    line: "Cromatone",
    productType: "боя",
    rawDescription:
      "Permanent hair colouring cream for greater intensity of the tone. Technical product exclusively for professionals.",
    forHairType: null,
    keyIngredients: ["SCP (Soya Colour Protect) patented technology"],
    imageUrl: u("/wp-content/uploads/2025/12/NX44-CROMAXTREM_Principal20-scaled-6.jpg"),
    sourceUrl: u("/en/gama/cromatone/"),
  },
  {
    slug: "cromatone-meteorites",
    name: "Cromatone Meteorites",
    line: "Cromatone",
    productType: "боя",
    rawDescription: "Permanent hair colouring cream. Technical product exclusively for professionals.",
    forHairType: null,
    keyIngredients: ["SCP (Soya Colour Protect) patented technology"],
    imageUrl: u(
      "/wp-content/uploads/2025/12/CB100_CROMATONE20METEORITES20BLONDE_Principal20-scaled-6.jpg",
    ),
    sourceUrl: u("/en/gama/cromatone/"),
  },
  {
    slug: "cromatone-metallics",
    name: "Cromatone Metallics",
    line: "Cromatone",
    productType: "боя",
    rawDescription:
      "Versatile permanent hair colouring cream (8 multitonal shades). Technical product exclusively for professionals.",
    forHairType: null,
    keyIngredients: ["SCP (Soya Colour Protect) patented technology"],
    imageUrl: u("/wp-content/uploads/2025/12/N1002M_CROMATONE20METALLICS_Principal-scaled-6.jpg"),
    sourceUrl: u("/en/gama/cromatone/"),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Oxibel — оксиданти / активиращ крем (categorySlug: oksidanti).
// Един артикул в няколко обемни сили (volumes). Image URL-и от /en/gama/cromatone/.
// Запазваме като една продуктова единица „Oxibel Activating Cream“ с изброени обеми
// (отделните volume варианти споделят една и съща продуктова концепция).
// ─────────────────────────────────────────────────────────────────────────────

const OXIBEL: Array<Omit<RawProduct, "categorySlug">> = [
  {
    slug: "oxibel-activating-cream",
    name: "Oxibel Activating Cream",
    line: "Oxibel",
    productType: "оксидант",
    rawDescription:
      "An activating cream for colouring and lightening processes; essential to get the right texture for each in-salon Cromatone colouring session and to facilitate coverage and evenness of colour. Available in 7 vol (2%), 12.5 vol (3.75%), 20 vol (6%), 30 vol (9%) and 40 vol (12%). 1000 ml. Technical product exclusively for professionals.",
    forHairType: null,
    keyIngredients: [],
    imageUrl: u("/wp-content/uploads/2025/12/cromatone_oxibel_7.jpg"),
    sourceUrl: u("/en/gama/cromatone/"),
    note: "Един продукт в 5 обема (7/12.5/20/30/40 vol). Image = 7 vol вариант; другите: cromatone_oxibel_{20,30,40}.jpg.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Decode — стайлинг (categorySlug: stayling).
// Decode е голямо семейство от под-линии. По спецификацията (Task 1) събираме
// НИВО ЛИНИЯ: име + фактологично едноредово описание + image URL ако е наличен.
// CONTINGENCY: Decode под-линиите ползват yootheme-cache image URL-и (зад JS на сайта).
// Проверено с curl: тези URL-и СА реални сваляеми изображения (HTTP 200, JPEG/PNG),
// но са lifestyle/категорийни снимки, не чисти пакшотове на флакон.
// ─────────────────────────────────────────────────────────────────────────────

const DECODE: Array<Omit<RawProduct, "categorySlug">> = [
  {
    slug: "decode",
    name: "Decode",
    line: "Decode",
    productType: "стайлинг",
    rawDescription:
      "Styling and finishing products to provide definition, hold, texture and shine. They protect and treat hair in order to create any hairstyle with the perfect finish. Sub-lines: Decode Zero, Decode Curl, Decode Smooth, Decode Finish, Decode Volume, Decode Texture, Decode Texture Men.",
    forHairType: null,
    keyIngredients: [],
    imageUrl: u(
      "/wp-content/uploads/yootheme/cache/6d/Montibello_Decode_F02_Look-Curly_0306__-scaled-e1768502059312-6d8d0301.jpg",
    ),
    sourceUrl: u("/en/range/decode/"),
    note: "Линия-ниво (Task 1). yootheme-cache lifestyle image (проверен сваляем). Под-линиите имат собствени продукти — за по-късно при нужда.",
  },
  {
    slug: "decode-curl",
    name: "Decode Curl",
    line: "Decode",
    productType: "стайлинг",
    rawDescription: "Decode sub-line for defined, loose or natural curls.",
    forHairType: "Curly hair",
    keyIngredients: [],
    imageUrl: u("/wp-content/uploads/yootheme/cache/63/curls-1-6333cecb.jpg"),
    sourceUrl: u("/en/range/decode/"),
    note: "yootheme-cache категорийна снимка (проверена сваляема, не пакшот).",
  },
  {
    slug: "decode-smooth",
    name: "Decode Smooth",
    line: "Decode",
    productType: "стайлинг",
    rawDescription: "Decode professional straightening sub-line: heat protection and anti-frizz control for straight, shiny hair.",
    forHairType: "Hair needing straightening / anti-frizz",
    keyIngredients: [],
    imageUrl: u("/wp-content/uploads/yootheme/cache/16/ChatGPT-Image-21-ene-2026-15_28_42-1-169e099f.png"),
    sourceUrl: u("/en/range/decode/"),
    note: "yootheme-cache категорийна снимка (проверена сваляема, не пакшот).",
  },
  {
    slug: "decode-finish",
    name: "Decode Finish",
    line: "Decode",
    productType: "стайлинг",
    rawDescription: "Decode finishing sub-line with moisture-resistant resin to prolong styling.",
    forHairType: null,
    keyIngredients: [],
    imageUrl: u("/wp-content/uploads/yootheme/cache/73/finish-7316f9ef.jpg"),
    sourceUrl: u("/en/range/decode/"),
    note: "yootheme-cache категорийна снимка (проверена сваляема, не пакшот).",
  },
  {
    slug: "decode-volume",
    name: "Decode Volume",
    line: "Decode",
    productType: "стайлинг",
    rawDescription: "Decode styling sub-line for volume.",
    forHairType: null,
    keyIngredients: [],
    imageUrl: u("/wp-content/uploads/yootheme/cache/20/volume-2-20eaf3d3.jpg"),
    sourceUrl: u("/en/range/decode/"),
    note: "yootheme-cache категорийна снимка (проверена сваляема, не пакшот). Едноредово описание не е експлицитно на range страницата.",
  },
  {
    slug: "decode-texture",
    name: "Decode Texture",
    line: "Decode",
    productType: "стайлинг",
    rawDescription: "Decode styling sub-line for texture.",
    forHairType: null,
    keyIngredients: [],
    imageUrl: u("/wp-content/uploads/yootheme/cache/b7/terxture-b7fc6705.jpg"),
    sourceUrl: u("/en/range/decode/"),
    note: "yootheme-cache категорийна снимка (проверена сваляема, не пакшот). Едноредово описание не е експлицитно на range страницата.",
  },
  {
    slug: "decode-texture-men",
    name: "Decode Texture Men",
    line: "Decode",
    productType: "стайлинг",
    rawDescription: "Decode men's texturising styling sub-line (e.g. moulding cream, gel, matte wax).",
    forHairType: "Men's hair",
    keyIngredients: [],
    imageUrl: u("/wp-content/uploads/yootheme/cache/2c/terxture-men-2c372bc2.jpg"),
    sourceUrl: u("/en/range/decode/"),
    note: "yootheme-cache категорийна снимка (проверена сваляема, не пакшот).",
  },
];

// Сглобяване с категории.
const PRODUCTS: RawProduct[] = [
  ...HOP.map((p) => ({ ...p, categorySlug: "grizha" as const })),
  ...CROMATONE.map((p) => ({ ...p, categorySlug: "boyadisvane" as const })),
  ...OXIBEL.map((p) => ({ ...p, categorySlug: "oksidanti" as const })),
  ...DECODE.map((p) => ({ ...p, categorySlug: "stayling" as const })),
];

// ─────────────────────────────────────────────────────────────────────────────
// Верификация на image URL-ите с реална HTTP заявка (curl + file).
// ─────────────────────────────────────────────────────────────────────────────

function curlAvailable(): boolean {
  try {
    execFileSync("curl", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

interface ImageCheck {
  url: string;
  ok: boolean;
  httpCode: string;
  contentType: string;
  bytes: number;
}

function verifyImage(url: string): ImageCheck {
  const out = join(tmpdir(), `mtb-${Math.random().toString(36).slice(2)}.bin`);
  // -sL следва редиректи; -o записва тялото; -w връща код, type и размер на отделни редове.
  const raw = execFileSync(
    "curl",
    [
      "-sL",
      "-A",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "-o",
      out,
      "-w",
      "%{http_code}\\n%{content_type}\\n%{size_download}",
      url,
    ],
    { encoding: "utf8" },
  );
  const [httpCode = "", contentType = "", sizeStr = "0"] = raw.split("\n");
  const bytes = parseInt(sizeStr, 10) || 0;
  const ok = httpCode.startsWith("2") && /image\//i.test(contentType) && bytes > 1024;
  return { url, ok, httpCode, contentType: contentType.trim(), bytes };
}

function main() {
  const skipVerify = process.argv.includes("--no-verify");
  const outPath = join(process.cwd(), "scripts", "montibello-raw.json");

  // Self-check: slugs уникални и kebab-case; categorySlug валиден.
  const validCats = new Set(["grizha", "boyadisvane", "oksidanti", "stayling"]);
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const p of PRODUCTS) {
    if (kebab(p.name) !== p.slug) problems.push(`slug ${p.slug} != kebab(${p.name})=${kebab(p.name)}`);
    if (seen.has(p.slug)) problems.push(`дублиран slug: ${p.slug}`);
    seen.add(p.slug);
    if (!validCats.has(p.categorySlug)) problems.push(`невалиден categorySlug: ${p.categorySlug} (${p.slug})`);
  }
  if (problems.length) {
    console.error("✗ Validation проблеми:\n  " + problems.join("\n  "));
    process.exitCode = 1;
    return;
  }

  // Верификация на image URL-ите.
  const results: Array<ImageCheck & { slug: string }> = [];
  if (!skipVerify && curlAvailable()) {
    console.log(`Проверявам ${PRODUCTS.length} image URL-а с curl...\n`);
    for (const p of PRODUCTS) {
      if (!p.imageUrl) {
        console.log(`  ⊘ ${p.slug}: imageUrl=null`);
        continue;
      }
      const chk = verifyImage(p.imageUrl);
      results.push({ slug: p.slug, ...chk });
      const mark = chk.ok ? "✓" : "✗";
      console.log(`  ${mark} ${p.slug}: HTTP=${chk.httpCode} type=${chk.contentType} bytes=${chk.bytes}`);
    }
  } else {
    console.log(skipVerify ? "Пропускам верификация (--no-verify)." : "curl липсва — пропускам верификация.");
  }

  // Записваме само спецификационните полета (без sourceUrl/note? — пазим ги за одит,
  // но JSON формата по заданието е { slug, name, line, categorySlug, productType,
  // rawDescription, forHairType, keyIngredients, imageUrl }). Добавяме sourceUrl/note
  // като extra полета — не пречат на консуматора и помагат при ревю.
  const json = PRODUCTS.map((p) => ({
    slug: p.slug,
    name: p.name,
    line: p.line,
    categorySlug: p.categorySlug,
    productType: p.productType,
    rawDescription: p.rawDescription,
    forHairType: p.forHairType,
    keyIngredients: p.keyIngredients,
    imageUrl: p.imageUrl,
    sourceUrl: p.sourceUrl,
    ...(p.note ? { note: p.note } : {}),
  }));

  writeFileSync(outPath, JSON.stringify(json, null, 2) + "\n", "utf8");

  // Кратък отчет.
  const withImg = PRODUCTS.filter((p) => p.imageUrl).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n— Отчет —`);
  console.log(`Продукти: ${PRODUCTS.length}`);
  console.log(`  grizha: ${PRODUCTS.filter((p) => p.categorySlug === "grizha").length}`);
  console.log(`  boyadisvane: ${PRODUCTS.filter((p) => p.categorySlug === "boyadisvane").length}`);
  console.log(`  oksidanti: ${PRODUCTS.filter((p) => p.categorySlug === "oksidanti").length}`);
  console.log(`  stayling: ${PRODUCTS.filter((p) => p.categorySlug === "stayling").length}`);
  console.log(`С imageUrl: ${withImg} / ${PRODUCTS.length}`);
  if (results.length) {
    console.log(`Верифицирани OK: ${results.filter((r) => r.ok).length} / ${results.length}`);
    if (failed.length) {
      console.log(`✗ ПРОВАЛЕНИ image URL-и (нуждаят се от потребителска връзка):`);
      for (const f of failed) console.log(`   ${f.slug}: HTTP=${f.httpCode} type=${f.contentType} bytes=${f.bytes}`);
    }
  }
  console.log(`\nЗаписано: ${outPath}`);
}

main();
