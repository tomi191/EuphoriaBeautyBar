/**
 * Montibello каталог — представяне на партньорската марка по категории.
 *
 * Euphoria работи с Montibello (испанска професионална марка, Барселона).
 * Тук показваме каталога по категории; продуктите НЕ се продават онлайн —
 * купуват се на място в салона след консултация.
 *
 * Принцип за съдържанието: само проверими факти. Имената на линиите, типовете,
 * съставките и за каква коса са продуктите идват от официалния каталог
 * (hair.montibello.com) през scripts/montibello-raw.json. Описанията са на
 * български, заземени в реалните факти за всеки продукт — не измисляме ползи,
 * съставки или твърдения, които ги няма в източника.
 *
 * Акцентните цветове реферират салвия палитрата (НЕ виолет/циан) — виж globals.css.
 */

export type MontibelloAccent = "sage" | "mint" | "blush" | "ink";

const ACCENT_OKLCH: Record<MontibelloAccent, string> = {
  sage: "oklch(0.47 0.085 162)",
  mint: "oklch(0.83 0.08 168)",
  blush: "oklch(0.78 0.09 25)",
  ink: "oklch(0.30 0.02 160)",
};

export function accentColor(a: MontibelloAccent): string {
  return ACCENT_OKLCH[a];
}

export interface MontibelloCategory {
  slug: string;
  title: string;
  shortTitle: string;
  /** Фактическо описание на категорията — какво включва. */
  description: string;
}

export interface MontibelloProduct {
  slug: string;
  name: string;
  /** Подсемейство/линия (HOP, Cromatone, Oxibel, Decode…). */
  line: string;
  categorySlug: string;
  /** Фактически тип на продукта. */
  productType:
    | "шампоан"
    | "маска"
    | "балсам"
    | "спрей"
    | "боя"
    | "оксидант"
    | "стайлинг"
    | "терапия"
    | "серум";
  /** Един ред за листинга. */
  shortDescription: string;
  /** 2-3 кратки абзаца на български, заземени в реалните факти. */
  description: string;
  /** За каква коса е продуктът (от официалния каталог). */
  forHairType?: string;
  /** Ключови съставки/активи (от официалния каталог). */
  keyIngredients?: string[];
  /** Официална брандова снимка (по slug в /images/montibello/). */
  officialImage?: string;
  accent: MontibelloAccent;
  /** Салонен/професионален продукт — не се продава за домашна употреба. */
  professional?: boolean;
}

export const montibelloCategories: MontibelloCategory[] = [
  {
    slug: "grizha",
    title: "Грижа за косата",
    shortTitle: "Грижа",
    description:
      "Шампоани, маски, балсами и серуми за ежедневна и интензивна грижа. Основната линия е HOP - биотехнология от водорасли (LifeAlgae) с активи според нуждата на косата и скалпа.",
  },
  {
    slug: "boyadisvane",
    title: "Боядисване",
    shortTitle: "Цвят",
    description:
      "Трайните оксидативни бои Cromatone - технически продукти само за професионална употреба. Прилагат се от майстор в салона след диагностика.",
  },
  {
    slug: "oksidanti",
    title: "Оксиданти",
    shortTitle: "Оксиданти",
    description:
      "Активиращият крем Oxibel в различни обеми. Задава точната текстура на боята и осигурява равномерно покритие. Салонен материал.",
  },
  {
    slug: "stayling",
    title: "Стайлинг и финиш",
    shortTitle: "Стайлинг",
    description:
      "Decode - гамата за оформяне и финиш: дефиниция, фиксация, текстура и блясък, с под-линии за къдрици, изправяне, обем и мъжки стайлинг.",
  },
];

export const montibelloProducts: MontibelloProduct[] = [
  // ── ГРИЖА: HOP ────────────────────────────────────────────────

  // Ultra Repair routine
  {
    slug: "ultra-repair-shampoo",
    name: "Ultra Repair Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Възстановяващ шампоан за увредена коса, 300 мл.",
    description:
      "Първата стъпка от рутината Ultra Repair. Измива нежно, но още под душа започва да реконструира коса, изтощена от топлинно оформяне или химични процеси.\n\nВ основата стоят веган колаген (растителен протеинов комплекс) и биотехнологията LifeAlgae. Подготвя дължините за балсама и маската от същата серия.",
    forHairType: "Увредена коса (от топлина и химия)",
    keyIngredients: ["Веган колаген (растителен протеинов комплекс)", "LifeAlgae биотехнология"],
    officialImage: "/images/montibello/ultra-repair-shampoo.webp",
    accent: "sage",
  },
  {
    slug: "ultra-repair-rinse",
    name: "Ultra Repair Rinse",
    line: "HOP",
    categorySlug: "grizha",
    productType: "балсам",
    shortDescription: "Балсам за увредена коса от серията Ultra Repair, 200 мл.",
    description:
      "Балсам, който идва след Ultra Repair шампоана. Облекчава разресването и връща мекота на коса, останала груба след химия или често изправяне.\n\nРаботи със същите активи като останалата серия - веган колаген и LifeAlgae.",
    forHairType: "Увредена коса (от топлина и химия)",
    keyIngredients: ["Веган колаген (растителен протеинов комплекс)", "LifeAlgae биотехнология"],
    officialImage: "/images/montibello/ultra-repair-rinse.webp",
    accent: "sage",
  },
  {
    slug: "ultra-repair-mask",
    name: "Ultra Repair Mask",
    line: "HOP",
    categorySlug: "grizha",
    productType: "маска",
    shortDescription: "Възстановяваща маска от серията Ultra Repair, 200 мл.",
    description:
      "Интензивната стъпка в рутината Ultra Repair. Веган колагенът и LifeAlgae работят навътре във влакното, докато маската стои на косата, и възстановяват устойчивостта на най-увредените участъци.\n\nЗа коса, която след сешоар, преса или изрусяване е станала чуплива и трудна за оформяне.",
    forHairType: "Увредена коса (от топлина и химия)",
    keyIngredients: ["Веган колаген (растителен протеинов комплекс)", "LifeAlgae биотехнология"],
    officialImage: "/images/montibello/ultra-repair-mask.webp",
    accent: "sage",
  },
  {
    slug: "ultra-repair-sealed-ends",
    name: "Ultra Repair Sealed Ends",
    line: "HOP",
    categorySlug: "grizha",
    productType: "терапия",
    shortDescription: "Подхранващ крем за краищата, 75 мл.",
    description:
      "Несмиваем крем, насочен само към краищата - там, където косата изсъхва и се нацепва най-бързо. Запечатва ги и ги държи подхранени между измиванията.\n\nЧаст от рутината Ultra Repair, с веган колаген и LifeAlgae.",
    forHairType: "Увредена коса, сухи краища",
    keyIngredients: ["Веган колаген (растителен протеинов комплекс)", "LifeAlgae биотехнология"],
    officialImage: "/images/montibello/ultra-repair-sealed-ends.webp",
    accent: "sage",
  },
  {
    slug: "ultra-repair-overnight-serum",
    name: "Ultra Repair Overnight Serum",
    line: "HOP",
    categorySlug: "grizha",
    productType: "серум",
    shortDescription: "Нощен серум за възстановяване, 100 мл.",
    description:
      "Нанася се вечер и работи, докато спиш. По данни на марката връща сила, влага и мекота за една нощ.\n\nФинален акцент в серията Ultra Repair, със същата база от веган колаген и LifeAlgae.",
    forHairType: "Увредена коса (от топлина и химия)",
    keyIngredients: ["Веган колаген (растителен протеинов комплекс)", "LifeAlgae биотехнология"],
    officialImage: "/images/montibello/ultra-repair-overnight-serum.webp",
    accent: "sage",
  },

  // Colour Last routine
  {
    slug: "colour-last-shampoo",
    name: "Colour Last Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Защитен шампоан за боядисана коса, 300 мл.",
    description:
      "Рутината Colour Last удължава живота на цвета и пази боядисаната коса хидратирана. Шампоанът мие меко, без да издърпва пигмента преждевременно.\n\nС ферулова киселина (растителен антиоксидант), LifeAlgae и UV филтър срещу избледняване от слънцето.",
    forHairType: "Боядисана коса",
    keyIngredients: ["LifeAlgae биотехнология", "Ферулова киселина (растителен антиоксидант)", "UV филтър"],
    officialImage: "/images/montibello/colour-last-shampoo.webp",
    accent: "blush",
  },
  {
    slug: "colour-last-rinse",
    name: "Colour Last Rinse",
    line: "HOP",
    categorySlug: "grizha",
    productType: "балсам",
    shortDescription: "Балсам за боядисана коса, 200 мл.",
    description:
      "Балсамът от Colour Last приглажда люспите след измиване, така че цветът да отразява повече светлина и да изглежда наситен по-дълго. Ферулова киселина, LifeAlgae и UV филтър.",
    forHairType: "Боядисана коса",
    keyIngredients: ["LifeAlgae биотехнология", "Ферулова киселина (растителен антиоксидант)", "UV филтър"],
    officialImage: "/images/montibello/colour-last-rinse.webp",
    accent: "blush",
  },
  {
    slug: "colour-last-mask",
    name: "Colour Last Mask",
    line: "HOP",
    categorySlug: "grizha",
    productType: "маска",
    shortDescription: "Маска за боядисана коса, 200 мл.",
    description:
      "Седмичната грижа от серията Colour Last. Подхранва дължините по-дълбоко от балсама и поддържа интензитета на цвета между посещенията в салона.\n\nСъс защита от ферулова киселина, LifeAlgae и UV филтър.",
    forHairType: "Боядисана коса",
    keyIngredients: ["LifeAlgae биотехнология", "Ферулова киселина (растителен антиоксидант)", "UV филтър"],
    officialImage: "/images/montibello/colour-last-mask.webp",
    accent: "blush",
  },

  // Smooth Hydration routine
  {
    slug: "smooth-hydration-shampoo",
    name: "Smooth Hydration Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Хидратиращ шампоан срещу непокорство, 300 мл.",
    description:
      "Рутината Smooth Hydration укротява сухата и наелектризирана коса и я прави по-лесна за прибиране. Шампоанът подсилва влакното, докато връща влага.\n\nС хиалуронова киселина, полизахариди от чиа и лен и LifeAlgae.",
    forHairType: "Суха, непокорна и/или наелектризирана коса",
    keyIngredients: ["Хиалуронова киселина", "Полизахариди от чиа и лен", "LifeAlgae биотехнология"],
    officialImage: "/images/montibello/smooth-hydration-shampoo.webp",
    accent: "mint",
  },
  {
    slug: "smooth-hydration-rinse",
    name: "Smooth Hydration Rinse",
    line: "HOP",
    categorySlug: "grizha",
    productType: "балсам",
    shortDescription: "Хидратиращ балсам от серията Smooth Hydration, 200 мл.",
    description:
      "Балсамът напоява косата и приглажда повърхността, така че пухкавостта спада, а разресването става безпроблемно. С хиалуронова киселина, полизахариди от чиа и лен и LifeAlgae.",
    forHairType: "Суха, непокорна и/или наелектризирана коса",
    keyIngredients: ["Хиалуронова киселина", "Полизахариди от чиа и лен", "LifeAlgae биотехнология"],
    officialImage: "/images/montibello/smooth-hydration-rinse.webp",
    accent: "mint",
  },
  {
    slug: "smooth-hydration-mask",
    name: "Smooth Hydration Mask",
    line: "HOP",
    categorySlug: "grizha",
    productType: "маска",
    shortDescription: "Хидратираща маска от серията Smooth Hydration, 200 мл.",
    description:
      "Интензивната влага в серията Smooth Hydration. За дни, когато косата е особено суха и не иска да се поддаде - маската я напива и я оставя мека и податлива.\n\nХиалуронова киселина, полизахариди от чиа и лен, LifeAlgae.",
    forHairType: "Суха, непокорна и/или наелектризирана коса",
    keyIngredients: ["Хиалуронова киселина", "Полизахариди от чиа и лен", "LifeAlgae биотехнология"],
    officialImage: "/images/montibello/smooth-hydration-mask.webp",
    accent: "mint",
  },

  // Full Volume routine
  {
    slug: "full-volume-shampoo",
    name: "Full Volume Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Шампоан за обем на фина коса, 300 мл.",
    description:
      "За фина коса, която бързо увисва. Шампоанът изгражда плътност и повдига от корена, без да утежнява.\n\nОвесените пептиди и хидролизираният оризов протеин дават естествена структура на влакното, подкрепени от LifeAlgae.",
    forHairType: "Фина коса",
    keyIngredients: ["Овесени пептиди (аминокиселини за плътност и текстура)", "Хидролизиран оризов протеин", "LifeAlgae биотехнология"],
    officialImage: "/images/montibello/full-volume-shampoo.webp",
    accent: "mint",
  },
  {
    slug: "full-volume-foam-rinse",
    name: "Full Volume Foam Rinse",
    line: "HOP",
    categorySlug: "grizha",
    productType: "балсам",
    shortDescription: "Балсам-мус за обем, 150 мл.",
    description:
      "Балсам с лека пенлива текстура - грижи се за дължините, но не ги сваля надолу, така че обемът от шампоана остава. Част от рутината Full Volume с овесени пептиди, оризов протеин и LifeAlgae.",
    forHairType: "Фина коса",
    keyIngredients: ["Овесени пептиди (аминокиселини за плътност и текстура)", "Хидролизиран оризов протеин", "LifeAlgae биотехнология"],
    officialImage: "/images/montibello/full-volume-foam-rinse.webp",
    accent: "mint",
  },
  {
    slug: "full-volume-dry-shampoo",
    name: "Full Volume Dry Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "спрей",
    shortDescription: "Сух шампоан за обем, 150 мл.",
    description:
      "Освежава косата между измиванията и връща обема, когато прическата започне да спада. От рутината Full Volume - с овесени пептиди, оризов протеин и LifeAlgae.",
    forHairType: "Фина коса",
    keyIngredients: ["Овесени пептиди (аминокиселини за плътност и текстура)", "Хидролизиран оризов протеин", "LifeAlgae биотехнология"],
    officialImage: "/images/montibello/full-volume-dry-shampoo.webp",
    accent: "mint",
  },

  // Sun Care routine
  {
    slug: "sun-care-restorative-shampoo",
    name: "Sun Care Restorative Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Възстановяващ шампоан след слънце, 300 мл.",
    description:
      "За косата след лято, морска вода и часове на слънце. Измива солта и хлора и започва да възстановява изсушеното влакно.\n\nС ресвератрол, LifeAlgae и UV филтър - част от рутината Sun Care.",
    forHairType: "Коса, изложена на слънце",
    keyIngredients: ["LifeAlgae биотехнология", "Ресвератрол", "UV филтър"],
    officialImage: "/images/montibello/sun-care-restorative-shampoo.webp",
    accent: "blush",
  },
  {
    slug: "sun-care-restorative-mask",
    name: "Sun Care Restorative Mask",
    line: "HOP",
    categorySlug: "grizha",
    productType: "маска",
    shortDescription: "Възстановяваща маска след слънце, 200 мл.",
    description:
      "Интензивната грижа от серията Sun Care. Връща влагата и еластичността на коса, пресушена от слънце и солена вода. Ресвератрол, LifeAlgae и UV филтър.",
    forHairType: "Коса, изложена на слънце",
    keyIngredients: ["LifeAlgae биотехнология", "Ресвератрол", "UV филтър"],
    officialImage: "/images/montibello/sun-care-restorative-mask.webp",
    accent: "blush",
  },
  {
    slug: "sun-care-defence-mist",
    name: "Sun Care Defence Mist",
    line: "HOP",
    categorySlug: "grizha",
    productType: "спрей",
    shortDescription: "Защитен спрей с UV филтър, 125 мл.",
    description:
      "Лек спрей-балсам, който се пръска върху косата преди излагане на слънце. Овлажнява и оставя UV защита по дължините през деня на плажа или в планината.\n\nС ресвератрол, LifeAlgae и UV филтър.",
    forHairType: "Коса, изложена на слънце",
    keyIngredients: ["LifeAlgae биотехнология", "Ресвератрол", "UV филтър"],
    officialImage: "/images/montibello/sun-care-defence-mist.webp",
    accent: "blush",
  },

  // Detox routine
  {
    slug: "detox-cleansing-shampoo",
    name: "Detox Cleansing Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Детоксикиращ шампоан за омазнен скалп, 300 мл.",
    description:
      "Дълбоко почистване за скалп, който бързо се омазнява и натрупва замърсявания. Освежава и балансира, без да дразни.\n\nГлината поема излишния себум, а сарказинът регулира мастната секреция. LifeAlgae тук е с пребиотици и постбиотици за равновесие на скалпа.",
    forHairType: "Скалп и коса с излишна мазнина и замърсявания",
    keyIngredients: ["LifeAlgae с пребиотици и постбиотици", "Глина (поема излишна мазнина и замърсявания)", "Сарказин (аминокиселина, регулираща мастната секреция)"],
    officialImage: "/images/montibello/detox-cleansing-shampoo.webp",
    accent: "ink",
  },
  {
    slug: "scalp-detox-cleansing-treatment",
    name: "Scalp Detox Cleansing Treatment",
    line: "HOP",
    categorySlug: "grizha",
    productType: "терапия",
    shortDescription: "Балансираща терапия за скалп, 200 мл.",
    description:
      "Целенасочена грижа за самия скалп - почиства порите и възстановява баланса, когато корените се омазняват прекалено бързо.\n\nЧаст от рутината Detox, с глина, сарказин и LifeAlgae с пребиотици и постбиотици.",
    forHairType: "Скалп с излишна мазнина и замърсявания",
    keyIngredients: ["LifeAlgae с пребиотици и постбиотици", "Глина (поема излишна мазнина и замърсявания)", "Сарказин (аминокиселина, регулираща мастната секреция)"],
    officialImage: "/images/montibello/scalp-detox-cleansing-treatment.webp",
    accent: "ink",
  },

  // Sensitive Protection routine
  {
    slug: "sensitive-protection-shampoo",
    name: "Sensitive Protection Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Успокояващ шампоан за чувствителен скалп, 300 мл.",
    description:
      "За скалп, който се дразни, опъва или лющи. Шампоанът мие меко и успокоява, вместо да утежнява състоянието.\n\nНиацинамидът и сокът от алое вера действат върху раздразнението, заедно с LifeAlgae.",
    forHairType: "Чувствителен, раздразнен или лющещ се скалп",
    keyIngredients: ["Ниацинамид (антиоксидант)", "LifeAlgae биотехнология", "Сок от алое вера"],
    officialImage: "/images/montibello/sensitive-protection-shampoo.webp",
    accent: "sage",
  },
  {
    slug: "sensitive-protection-scalp-serum",
    name: "Sensitive Protection Scalp Serum",
    line: "HOP",
    categorySlug: "grizha",
    productType: "серум",
    shortDescription: "Успокояващ серум за скалп, 75 мл.",
    description:
      "Серум, който се нанася директно върху раздразнените участъци на скалпа. Допълва шампоана Sensitive Protection за по-целенасочено успокояване. С ниацинамид, сок от алое вера и LifeAlgae.",
    forHairType: "Чувствителен, раздразнен или лющещ се скалп",
    keyIngredients: ["Ниацинамид (антиоксидант)", "LifeAlgae биотехнология", "Сок от алое вера"],
    officialImage: "/images/montibello/sensitive-protection-scalp-serum.webp",
    accent: "sage",
  },

  // Purifying Balance routine
  {
    slug: "purifying-balance-shampoo",
    name: "Purifying Balance Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Пречистващ шампоан срещу пърхот, 300 мл.",
    description:
      "Пречистваща и ексфолираща грижа за натоварен скалп - стресиран, претоварен с токсини или склонен към пърхот.\n\nПропандиол каприлатът е активът срещу пърхот, насочен към маласезия. LifeAlgae тук е с пребиотици и постбиотици.",
    forHairType: "Стресиран и/или склонен към пърхот скалп",
    keyIngredients: ["LifeAlgae с пребиотици и постбиотици", "Пропандиол каприлат (актив срещу пърхот, насочен към маласезия)"],
    officialImage: "/images/montibello/purifying-balance-shampoo.webp",
    accent: "ink",
  },
  {
    slug: "purifying-balance-scalp-treatment",
    name: "Purifying Balance Scalp Treatment",
    line: "HOP",
    categorySlug: "grizha",
    productType: "терапия",
    shortDescription: "Ексфолираща терапия за скалп, 200 мл.",
    description:
      "Ексфолира скалпа и разгражда натрупването, което захранва пърхота. Работи в тандем с пречистващия шампоан от същата серия.\n\nС пропандиол каприлат срещу маласезия и LifeAlgae с пребиотици и постбиотици.",
    forHairType: "Стресиран и/или склонен към пърхот скалп",
    keyIngredients: ["LifeAlgae с пребиотици и постбиотици", "Пропандиол каприлат (актив срещу пърхот, насочен към маласезия)"],
    officialImage: "/images/montibello/purifying-balance-scalp-treatment.webp",
    accent: "ink",
  },

  // Blonde Glow
  {
    slug: "blonde-glow-shampoo",
    name: "Blonde Glow Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Озаряващ шампоан за руса коса, 300 мл.",
    description:
      "За руса и изрусена коса, която тегли към жълто. Лилавите пигменти неутрализират топлите оттенъци и държат тона чист.\n\nЕдновременно подсилва и реконструира изсветленото влакно, дава блясък и го пази от окисляване. С витамин C, LifeAlgae и UV филтър.",
    forHairType: "Руса или изрусена коса",
    keyIngredients: ["Витамин C (антиоксидант)", "LifeAlgae биотехнология", "UV филтър", "Лилави (неутрализиращи) пигменти"],
    officialImage: "/images/montibello/blonde-glow-shampoo.webp",
    accent: "blush",
  },
  {
    slug: "blonde-glow-mask",
    name: "Blonde Glow Mask",
    line: "HOP",
    categorySlug: "grizha",
    productType: "маска",
    shortDescription: "Озаряваща маска за руса коса, 200 мл.",
    description:
      "Маската от серията Blonde Glow подхранва изсветлената коса в дълбочина и заедно с лилавите пигменти поддържа студения, чист рус. С витамин C, LifeAlgae и UV филтър.",
    forHairType: "Руса или изрусена коса",
    keyIngredients: ["Витамин C (антиоксидант)", "LifeAlgae биотехнология", "UV филтър", "Лилави (неутрализиращи) пигменти"],
    officialImage: "/images/montibello/blonde-glow-mask.webp",
    accent: "blush",
  },

  // Silver White
  {
    slug: "silver-white-shampoo",
    name: "Silver White Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Озаряващ шампоан за бяла коса, 300 мл.",
    description:
      "Грижа за бяла и сива коса, която подчертава и подсилва естествения сребрист тон. Директните пигменти освежават цвета, а антиоксидантите и UV филтърът го пазят чист.\n\nLifeAlgae тук е подсилена с B-комплекс.",
    forHairType: "Бяла или сива коса",
    keyIngredients: ["LifeAlgae + B-комплекс", "Директни пигменти", "Антиоксиданти", "UV филтър"],
    officialImage: "/images/montibello/silver-white-shampoo.webp",
    accent: "ink",
  },
  {
    slug: "silver-white-rinse",
    name: "Silver White Rinse",
    line: "HOP",
    categorySlug: "grizha",
    productType: "балсам",
    shortDescription: "Озаряващ балсам за бяла коса, 200 мл.",
    description:
      "Балсамът от Silver White приглажда косата и поддържа сребристия тон между измиванията. С директни пигменти, антиоксиданти, UV филтър и LifeAlgae с B-комплекс.",
    forHairType: "Бяла или сива коса",
    keyIngredients: ["LifeAlgae + B-комплекс", "Директни пигменти", "Антиоксиданти", "UV филтър"],
    officialImage: "/images/montibello/silver-white-rinse.webp",
    accent: "ink",
  },

  // Reflects (colour boost shampoos)
  {
    slug: "brown-reflects-shampoo",
    name: "Brown Reflects Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Шампоан, който освежава кафявия цвят, 300 мл.",
    description:
      "Подсилва отблясъците на средно кафявата коса при всяко измиване, така че цветът да не изглежда матов между боядисванията. Директни пигменти, B-комплекс, антиоксиданти, UV филтър и LifeAlgae.",
    forHairType: "Средно кафява коса",
    keyIngredients: ["B-комплекс", "LifeAlgae биотехнология", "Директни пигменти", "Антиоксиданти", "UV филтър"],
    officialImage: "/images/montibello/brown-reflects-shampoo.webp",
    accent: "sage",
  },
  {
    slug: "red-reflects-shampoo",
    name: "Red Reflects Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Шампоан, който освежава червения цвят, 300 мл.",
    description:
      "Червеното избледнява по-бързо от всеки друг тон. Този шампоан подхранва пигмента при всяко измиване и удължава наситеността между посещенията.\n\nС директни пигменти, B-комплекс, антиоксиданти, UV филтър и LifeAlgae.",
    forHairType: "Червена коса",
    keyIngredients: ["B-комплекс", "LifeAlgae биотехнология", "Директни пигменти", "Антиоксиданти", "UV филтър"],
    officialImage: "/images/montibello/red-reflects-shampoo.webp",
    accent: "blush",
  },
  {
    slug: "copper-reflects-shampoo",
    name: "Copper Reflects Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Шампоан, който освежава медния цвят, 300 мл.",
    description:
      "Поддържа топлия меден тон жив и пълен със светлина между боядисванията. Директни пигменти, B-комплекс, антиоксиданти, UV филтър и LifeAlgae.",
    forHairType: "Медна коса",
    keyIngredients: ["B-комплекс", "LifeAlgae биотехнология", "Директни пигменти", "Антиоксиданти", "UV филтър"],
    officialImage: "/images/montibello/copper-reflects-shampoo.webp",
    accent: "blush",
  },
  {
    slug: "purple-reflects-shampoo",
    name: "Purple Reflects Shampoo",
    line: "HOP",
    categorySlug: "grizha",
    productType: "шампоан",
    shortDescription: "Шампоан, който освежава лилавия цвят, 300 мл.",
    description:
      "За модни лилави тонове, които иначе бързо се измиват. Освежава пигмента при всяко измиване и пази цвета наситен. С директни пигменти, B-комплекс, антиоксиданти, UV филтър и LifeAlgae.",
    forHairType: "Лилава коса",
    keyIngredients: ["B-комплекс", "LifeAlgae биотехнология", "Директни пигменти", "Антиоксиданти", "UV филтър"],
    officialImage: "/images/montibello/purple-reflects-shampoo.webp",
    accent: "ink",
  },

  // In-salon well-ageing concentrates (professional)
  {
    slug: "smoothing-concentrate",
    name: "Smoothing Concentrate",
    line: "HOP",
    categorySlug: "grizha",
    productType: "терапия",
    shortDescription: "Салонен концентрат за мекота и контрол на пухкавостта.",
    description:
      "Салонна процедура от well-ageing линията на HOP. Концентратът се прилага от майстор, за да направи косата по-мека и да овладее непокорството.\n\nС LifeAlgae и молекулен ензимен комплекс.",
    keyIngredients: ["LifeAlgae биотехнология", "Молекулен ензимен комплекс"],
    officialImage: "/images/montibello/smoothing-concentrate.webp",
    accent: "mint",
    professional: true,
  },
  {
    slug: "colour-concentrate",
    name: "Colour Concentrate",
    line: "HOP",
    categorySlug: "grizha",
    productType: "терапия",
    shortDescription: "Салонен концентрат за задържане на цвят и блясък.",
    description:
      "Well-ageing концентрат, който майсторът включва в салонната грижа, за да задържи цвета и блясъка след боядисване. С LifeAlgae и молекулен ензимен комплекс.",
    keyIngredients: ["LifeAlgae биотехнология", "Молекулен ензимен комплекс"],
    officialImage: "/images/montibello/colour-concentrate.webp",
    accent: "blush",
    professional: true,
  },
  {
    slug: "intensifier-fine-to-medium",
    name: "Intensifier Fine to Medium",
    line: "HOP",
    categorySlug: "grizha",
    productType: "терапия",
    shortDescription: "Салонен базов интензификатор за фина до средна коса.",
    description:
      "Базата на салонната well-ageing процедура, дозирана за фина до средна коса. Майсторът я комбинира с концентратите според диагнозата. С LifeAlgae и молекулен ензимен комплекс.",
    forHairType: "Фина до средна коса",
    keyIngredients: ["LifeAlgae биотехнология", "Молекулен ензимен комплекс"],
    officialImage: "/images/montibello/intensifier-fine-to-medium.webp",
    accent: "sage",
    professional: true,
  },
  {
    slug: "intensifier-medium-to-coarse",
    name: "Intensifier Medium to Coarse",
    line: "HOP",
    categorySlug: "grizha",
    productType: "терапия",
    shortDescription: "Салонен базов интензификатор за средна до плътна коса.",
    description:
      "За по-плътна и устойчива коса майсторът избира тази база на well-ageing процедурата и я съчетава с концентратите според диагнозата. С LifeAlgae и молекулен ензимен комплекс.",
    forHairType: "Средна до плътна коса",
    keyIngredients: ["LifeAlgae биотехнология", "Молекулен ензимен комплекс"],
    officialImage: "/images/montibello/intensifier-medium-to-coarse.webp",
    accent: "sage",
    professional: true,
  },
  {
    slug: "recharge-strength",
    name: "Recharge Strength",
    line: "HOP",
    categorySlug: "grizha",
    productType: "терапия",
    shortDescription: "Салонен концентрат за крехка и увредена коса.",
    description:
      "Well-ageing концентрат за крехка и увредена коса. Аминокиселините и овлажняващите фактори реконструират най-вътрешните слоеве на влакното и го пазят от чупене.\n\nСалонна процедура - прилага се от майстор. С LifeAlgae и молекулен ензимен комплекс.",
    forHairType: "Крехка и/или увредена коса",
    keyIngredients: ["LifeAlgae биотехнология", "Молекулен ензимен комплекс", "Аминокиселини", "Овлажняващи фактори"],
    officialImage: "/images/montibello/recharge-strength.webp",
    accent: "sage",
    professional: true,
  },

  // ── БОЯДИСВАНЕ: Cromatone (professional) ──────────────────────
  {
    slug: "cromatone",
    name: "Cromatone",
    line: "Cromatone",
    categorySlug: "boyadisvane",
    productType: "боя",
    shortDescription: "Трайна боя-крем за коса, 60 г. Само за професионална употреба.",
    description:
      "Гамата трайни оксидативни бои на Montibello. Покрива равномерно от корена до върха и постига наситен цвят или интензивни кичури, докато се грижи за косата по време на процеса.\n\nТехнически продукт, който се прилага само от майстор в салона. С патентованата SCP технология.",
    keyIngredients: ["SCP технология"],
    officialImage: "/images/montibello/cromatone.webp",
    accent: "blush",
    professional: true,
  },
  {
    slug: "cromaxtrem",
    name: "Cromaxtrem",
    line: "Cromatone",
    categorySlug: "boyadisvane",
    productType: "боя",
    shortDescription: "Трайна боя-крем за по-голяма интензивност на тона.",
    description:
      "Вариант на Cromatone за случаите, когато търсим максимална наситеност на тона. Технически продукт само за професионална употреба, с SCP технология.",
    keyIngredients: ["SCP технология"],
    officialImage: "/images/montibello/cromaxtrem.webp",
    accent: "ink",
    professional: true,
  },
  {
    slug: "cromatone-meteorites",
    name: "Cromatone Meteorites",
    line: "Cromatone",
    categorySlug: "boyadisvane",
    productType: "боя",
    shortDescription: "Трайна боя-крем от серията Cromatone.",
    description:
      "Поредица трайни нюанси от семейството Cromatone. Технически продукт само за професионална употреба, със SCP технология.",
    keyIngredients: ["SCP технология"],
    officialImage: "/images/montibello/cromatone-meteorites.webp",
    accent: "ink",
    professional: true,
  },
  {
    slug: "cromatone-metallics",
    name: "Cromatone Metallics",
    line: "Cromatone",
    categorySlug: "boyadisvane",
    productType: "боя",
    shortDescription: "Многостранна трайна боя в 8 мултитонални нюанса.",
    description:
      "Осем мултитонални нюанса от Cromatone за студени, металик финиши и комбинирани техники. Технически продукт само за професионална употреба, със SCP технология.",
    keyIngredients: ["SCP технология"],
    officialImage: "/images/montibello/cromatone-metallics.webp",
    accent: "ink",
    professional: true,
  },

  // ── ОКСИДАНТИ: Oxibel (professional) ──────────────────────────
  {
    slug: "oxibel-activating-cream",
    name: "Oxibel Activating Cream",
    line: "Oxibel",
    categorySlug: "oksidanti",
    productType: "оксидант",
    shortDescription: "Активиращ крем за боядисване и изсветляване, 1000 мл.",
    description:
      "Кремообразен оксидант, който задава точната текстура на всяка боя Cromatone и улеснява равномерното покритие при боядисване и изсветляване.\n\nПредлага се в пет обема - 7 vol (2%), 12.5 vol (3.75%), 20 vol (6%), 30 vol (9%) и 40 vol (12%). Технически продукт само за професионална употреба.",
    officialImage: "/images/montibello/oxibel-activating-cream.webp",
    accent: "mint",
    professional: true,
  },

  // ── СТАЙЛИНГ: Decode ──────────────────────────────────────────
  {
    slug: "decode",
    name: "Decode",
    line: "Decode",
    categorySlug: "stayling",
    productType: "стайлинг",
    shortDescription: "Гамата за оформяне и финиш на Montibello.",
    description:
      "Decode е цялата стайлинг гама: дефиниция, фиксация, текстура и блясък за всяка прическа. Продуктите оформят, но и пазят косата, докато го правят.\n\nРазделена е на под-линии - Curl, Smooth, Finish, Volume, Texture и Texture Men.",
    officialImage: "/images/montibello/decode.webp",
    accent: "ink",
  },
  {
    slug: "decode-curl",
    name: "Decode Curl",
    line: "Decode",
    categorySlug: "stayling",
    productType: "стайлинг",
    shortDescription: "Под-линия за дефинирани и естествени къдрици.",
    description:
      "Под-линията на Decode за къдрава коса. Оформя дефинирани, меки или естествени къдрици според това какъв резултат търсиш.",
    forHairType: "Къдрава коса",
    officialImage: "/images/montibello/decode-curl.webp",
    accent: "mint",
  },
  {
    slug: "decode-smooth",
    name: "Decode Smooth",
    line: "Decode",
    categorySlug: "stayling",
    productType: "стайлинг",
    shortDescription: "Под-линия за изправяне с термозащита.",
    description:
      "Професионалната под-линия на Decode за изправяне. Дава термозащита и контрол върху пухкавостта, за да остане косата гладка и с блясък след преса или сешоар.",
    forHairType: "Коса за изправяне / срещу пухкавост",
    officialImage: "/images/montibello/decode-smooth.webp",
    accent: "mint",
  },
  {
    slug: "decode-finish",
    name: "Decode Finish",
    line: "Decode",
    categorySlug: "stayling",
    productType: "стайлинг",
    shortDescription: "Под-линия за финиш и задържане на прическата.",
    description:
      "Финишната под-линия на Decode. Смолата, устойчива на влага, удължава задържането на прическата дори при влажен въздух.",
    officialImage: "/images/montibello/decode-finish.webp",
    accent: "ink",
  },
  {
    slug: "decode-volume",
    name: "Decode Volume",
    line: "Decode",
    categorySlug: "stayling",
    productType: "стайлинг",
    shortDescription: "Под-линия за обем при оформяне.",
    description:
      "Стайлинг за обем от гамата Decode. Повдига косата при оформяне и придава плътност на прическата.",
    officialImage: "/images/montibello/decode-volume.webp",
    accent: "mint",
  },
  {
    slug: "decode-texture",
    name: "Decode Texture",
    line: "Decode",
    categorySlug: "stayling",
    productType: "стайлинг",
    shortDescription: "Под-линия за текстура и матов финиш.",
    description:
      "Текстурата в гамата Decode. Добавя структура и грапавина на прическата за по-небрежен, оформен вид.",
    officialImage: "/images/montibello/decode-texture.webp",
    accent: "sage",
  },
  {
    slug: "decode-texture-men",
    name: "Decode Texture Men",
    line: "Decode",
    categorySlug: "stayling",
    productType: "стайлинг",
    shortDescription: "Текстурираща мъжка под-линия - крем, гел, матов восък.",
    description:
      "Мъжката текстурираща под-линия на Decode. Включва моделиращ крем, гел и матов восък за бързо ежедневно оформяне.",
    forHairType: "Мъжка коса",
    officialImage: "/images/montibello/decode-texture-men.webp",
    accent: "ink",
  },
];

export function getMontibelloProduct(slug: string): MontibelloProduct | undefined {
  return montibelloProducts.find((p) => p.slug === slug);
}

export function productsByCategory(categorySlug: string): MontibelloProduct[] {
  return montibelloProducts.filter((p) => p.categorySlug === categorySlug);
}

// ── Посока А «Рафт по нужда» (визия №45, 25.11.2026) ─────────────────────────
// Цени няма (думата на собственика, 25.11.2026): навсякъде «Обади се за цена и поръчка».

export interface MontibelloNeed {
  /** Котва на раздела в /montibello. */
  slug: string;
  /** Текстът на хапчето. */
  label: string;
  /** H2 на раздела. */
  title: string;
  /** Текстът на раздела (Саиф). */
  intro: string;
  /** Опаковката в кръгчето на хапчето. */
  thumb: string;
  products: string[];
}

export const montibelloNeeds: MontibelloNeed[] = [
  {
    slug: "boyadisana-kosa",
    label: "Боядисана коса",
    title: "Боядисана коса",
    intro:
      "Colour Last е рутината на Montibello за боядисана коса: по данни на марката хидратира и удължава трайността на цвета и блясъка. До нея са шампоаните Reflects, които освежават тона на средно кафява, червена, медна и лилава коса.",
    thumb: "colour-last-shampoo",
    products: [
      "colour-last-shampoo",
      "colour-last-rinse",
      "colour-last-mask",
      "brown-reflects-shampoo",
      "red-reflects-shampoo",
      "copper-reflects-shampoo",
      "purple-reflects-shampoo",
    ],
  },
  {
    slug: "rusa-i-siva",
    label: "Руса и сива",
    title: "Руса и сива коса",
    intro:
      "Blonde Glow е за руса или изрусена коса: лилави пигменти срещу жълтите оттенъци и витамин C. Silver White е за бяла или сива коса и освежава цвета ѝ с директни пигменти.",
    thumb: "blonde-glow-shampoo",
    products: ["blonde-glow-shampoo", "blonde-glow-mask", "silver-white-shampoo", "silver-white-rinse"],
  },
  {
    slug: "uvredena",
    label: "Увредена",
    title: "Увредена коса",
    intro:
      "Ultra Repair е рутината за коса, увредена от топлина и химия, с Vegan Collagen (растителен протеинов комплекс) и LifeAlgae. Има шампоан, балсам, маска, крем за краищата и нощен серум.",
    thumb: "ultra-repair-mask",
    products: [
      "ultra-repair-shampoo",
      "ultra-repair-rinse",
      "ultra-repair-mask",
      "ultra-repair-sealed-ends",
      "ultra-repair-overnight-serum",
    ],
  },
  {
    slug: "suha-i-nepokorna",
    label: "Суха и непокорна",
    title: "Суха и непокорна коса",
    intro:
      "Smooth Hydration е хидратираща рутина с хиалуронова киселина за суха, непокорна коса, която се накъдря. Включва шампоан, балсам и маска.",
    thumb: "smooth-hydration-shampoo",
    products: ["smooth-hydration-shampoo", "smooth-hydration-rinse", "smooth-hydration-mask"],
  },
  {
    slug: "fina-za-obem",
    label: "Фина, за обем",
    title: "Фина коса, за обем",
    intro:
      "Full Volume е за фина коса, на която ѝ трябва обем: шампоан, пяна-балсам и сух шампоан с овесени пептиди и оризов протеин, по данни на Montibello.",
    thumb: "full-volume-dry-shampoo",
    products: ["full-volume-shampoo", "full-volume-foam-rinse", "full-volume-dry-shampoo"],
  },
  {
    slug: "skalp",
    label: "Скалп",
    title: "Скалп",
    intro:
      "Detox е за скалп с излишна мазнина, Sensitive Protection за чувствителен скалп, Purifying Balance за скалп, склонен към пърхот (така ги описва Montibello). Това е козметика, не лечение; при оплакване от скалпа питай лекар.",
    thumb: "sensitive-protection-scalp-serum",
    products: [
      "detox-cleansing-shampoo",
      "scalp-detox-cleansing-treatment",
      "sensitive-protection-shampoo",
      "sensitive-protection-scalp-serum",
      "purifying-balance-shampoo",
      "purifying-balance-scalp-treatment",
    ],
  },
  {
    slug: "sled-slantse",
    label: "След слънце",
    title: "След слънце",
    intro:
      "Sun Care е за коса, изложена на слънце: шампоан и маска след слънце и защитна мъгла с UV филтър, 125 мл. Съдържат LifeAlgae и ресвератрол, по данни на Montibello.",
    thumb: "sun-care-defence-mist",
    products: ["sun-care-restorative-shampoo", "sun-care-restorative-mask", "sun-care-defence-mist"],
  },
  {
    slug: "kadritsi-i-stayling",
    label: "Къдрици и стайлинг",
    title: "Къдрици и стайлинг",
    intro:
      "Decode е гамата на Montibello за оформяне и финиш: дефиниция, фиксация, текстура и блясък. Има линии за къдрици, изправяне, финиш, обем и текстура.",
    thumb: "decode-curl",
    products: [
      "decode",
      "decode-curl",
      "decode-smooth",
      "decode-finish",
      "decode-volume",
      "decode-texture",
      "decode-texture-men",
    ],
  },
  {
    slug: "za-mazhe",
    label: "За мъже",
    title: "За мъже",
    intro:
      "Decode Texture Men е линията на Montibello за текстуриране на мъжка коса. Всичко останало в каталога е без деление по пол, затова не го делим на мъжко и дамско.",
    thumb: "decode-texture-men",
    products: ["decode-texture-men"],
  },
];

/** Серията (рутината) на всеки продукт за вкъщи: «От същата рутина» показва само нея. */
const SERIES: Record<string, string[]> = {
  "Colour Last": ["colour-last-shampoo", "colour-last-rinse", "colour-last-mask"],
  Reflects: ["brown-reflects-shampoo", "red-reflects-shampoo", "copper-reflects-shampoo", "purple-reflects-shampoo"],
  "Blonde Glow": ["blonde-glow-shampoo", "blonde-glow-mask"],
  "Silver White": ["silver-white-shampoo", "silver-white-rinse"],
  "Ultra Repair": [
    "ultra-repair-shampoo",
    "ultra-repair-rinse",
    "ultra-repair-mask",
    "ultra-repair-sealed-ends",
    "ultra-repair-overnight-serum",
  ],
  "Smooth Hydration": ["smooth-hydration-shampoo", "smooth-hydration-rinse", "smooth-hydration-mask"],
  "Full Volume": ["full-volume-shampoo", "full-volume-foam-rinse", "full-volume-dry-shampoo"],
  Detox: ["detox-cleansing-shampoo", "scalp-detox-cleansing-treatment"],
  "Sensitive Protection": ["sensitive-protection-shampoo", "sensitive-protection-scalp-serum"],
  "Purifying Balance": ["purifying-balance-shampoo", "purifying-balance-scalp-treatment"],
  "Sun Care": ["sun-care-restorative-shampoo", "sun-care-restorative-mask", "sun-care-defence-mist"],
  Decode: ["decode", "decode-curl", "decode-smooth", "decode-finish", "decode-volume", "decode-texture", "decode-texture-men"],
};

export function seriesOf(slug: string): string | undefined {
  return Object.keys(SERIES).find((s) => SERIES[s].includes(slug));
}

/** Другите продукти от същата серия, в реда на рутината. */
export function sameSeries(slug: string): MontibelloProduct[] {
  const s = seriesOf(slug);
  if (!s) return [];
  return SERIES[s].filter((x) => x !== slug).map((x) => getMontibelloProduct(x)!);
}

/** Първата нужда, в която стои продуктът (за хлебните трохи). */
export function needOf(slug: string): MontibelloNeed | undefined {
  return montibelloNeeds.find((n) => n.products.includes(slug));
}

/** Продуктите за вкъщи (38); салонните (professional) са само в блока «Само в салона». */
export const montibelloForSale = montibelloProducts.filter((p) => !p.professional);
export const montibelloSalonOnly = montibelloProducts.filter((p) => p.professional);

/** Обемът от краткото описание («…, 300 мл.» → «300 мл»). */
export function volumeOf(p: MontibelloProduct): string | undefined {
  const m = p.shortDescription.match(/(\d+)\s*мл/);
  return m ? `${m[1]} мл` : undefined;
}

const TYPE_LABEL: Record<MontibelloProduct["productType"], string> = {
  шампоан: "Шампоан",
  балсам: "Балсам",
  маска: "Маска",
  серум: "Серум",
  спрей: "Спрей",
  терапия: "Грижа",
  стайлинг: "Стайлинг",
  боя: "Боя",
  оксидант: "Оксидант",
};

/** «Шампоан · 300 мл» над името в картата. */
export function metaOf(p: MontibelloProduct): string {
  const v = volumeOf(p);
  return TYPE_LABEL[p.productType] + (v ? ` · ${v}` : "");
}

/** «За боядисана коса» под името; без данни за косата — краткото описание. */
export function forWhomOf(p: MontibelloProduct): string {
  const h = p.forHairType?.replace(" (от топлина и химия)", "");
  return h ? `За ${h[0].toLowerCase()}${h.slice(1)}` : p.shortDescription.replace(/\.$/, "");
}

export interface MontibelloCopy {
  metaTitle: string;
  metaDescription: string;
  subtitle: string;
  answer: string;
  alt: string;
  facts: [string, string][];
  faq: { q: string; a: string }[];
  routineNote: string;
  service: { label: string; href: string; text: string };
}

/** Текстовете на Саиф за първата партида (доклад 2026-11-25-content-montibello-текстове.md). Другите продукти показват сегашните описания. */
export const montibelloCopy: Record<string, MontibelloCopy> = {
  "blonde-glow-shampoo": {
    "metaTitle": "Blonde Glow Shampoo за руса коса | Montibello Варна",
    "metaDescription": "Blonde Glow Shampoo на Montibello, 300 мл: шампоан за руса и изрусена коса. Вземаш го от салон Euphoria във Варна; цена и наличност по телефона.",
    "subtitle": "за руса и изрусена коса",
    "answer": "Blonde Glow Shampoo е шампоан от рутината HOP Blonde Glow на Montibello за руса или изрусена коса, 300 мл. По данни на марката неутрализира жълтите оттенъци с лилави пигменти и дава блясък. Взема се от салона, ул. Петър Райчев 18, Варна; цена и наличност по телефона +359 898 66 33 15.",
    "alt": "Montibello HOP Blonde Glow Shampoo, 300 мл",
    "facts": [
      [
        "Серия",
        "HOP Blonde Glow"
      ],
      [
        "Вид",
        "Шампоан, 300 мл"
      ],
      [
        "За коса",
        "Руса или изрусена"
      ],
      [
        "Активи (по данни на Montibello)",
        "Витамин C (антиоксидант), LifeAlgae (комбинация от водорасли), UV филтър, лилави пигменти"
      ],
      [
        "Вземане",
        "От салона, ул. Петър Райчев 18, кв. Левски, Варна. вт–пт 10:00–19:00, сб 10:00–17:00."
      ],
      [
        "Наличност",
        "Потвърждаваме по телефона, преди да дойдеш."
      ]
    ],
    "faq": [
      {
        "q": "За коя коса е Blonde Glow Shampoo?",
        "a": "За руса или изрусена коса. Montibello го описва като шампоан, който подсилва и реконструира изсветлената коса, неутрализира жълтите оттенъци, дава блясък и пази от окисляване."
      },
      {
        "q": "Лилав шампоан ли е Blonde Glow?",
        "a": "Да, съдържа лилави пигменти, които неутрализират жълтите оттенъци. Montibello го води като озаряващ шампоан за руса коса."
      },
      {
        "q": "Какво съдържа?",
        "a": "По данни на Montibello: витамин C (антиоксидант), LifeAlgae (комбинация от водорасли), UV филтър и лилави пигменти. Пълният състав е на етикета на опаковката."
      },
      {
        "q": "С какво се комбинира?",
        "a": "С Blonde Glow Mask (200 мл) от същата рутина. Montibello ги описва като една рутина с лилави пигменти и витамин C."
      }
    ],
    "routineNote": "От същата рутина е и маската Blonde Glow Mask.",
    "service": {
      "label": "Балаяж във Варна",
      "href": "/uslugi/balayazh-varna",
      "text": "Изсветлената коса е точно за кого е серията. Балаяжът се прави при Снежана с професионални продукти Montibello и Goldwell; шампоанът е домашната грижа между посещенията."
    }
  },
  "blonde-glow-mask": {
    "metaTitle": "Blonde Glow Mask за руса коса | Montibello Варна",
    "metaDescription": "Blonde Glow Mask на Montibello, 200 мл: маска за руса и изрусена коса. Вземаш я от салон Euphoria във Варна; цена и наличност по телефона.",
    "subtitle": "за руса и изрусена коса",
    "answer": "Blonde Glow Mask е маска за руса или изрусена коса от рутината HOP Blonde Glow на Montibello, 200 мл. По данни на марката рутината има лилави пигменти срещу жълтите оттенъци и витамин C, който пази от окисляване. Взема се от салона, ул. Петър Райчев 18, Варна; цена и наличност по телефона +359 898 66 33 15.",
    "alt": "Montibello HOP Blonde Glow Mask, 200 мл",
    "facts": [
      [
        "Серия",
        "HOP Blonde Glow"
      ],
      [
        "Вид",
        "Маска, 200 мл"
      ],
      [
        "За коса",
        "Руса или изрусена"
      ],
      [
        "Активи на рутината (по данни на Montibello)",
        "Витамин C (антиоксидант), LifeAlgae (комбинация от водорасли), UV филтър, лилави пигменти"
      ],
      [
        "Вземане",
        "От салона, ул. Петър Райчев 18, кв. Левски, Варна. вт–пт 10:00–19:00, сб 10:00–17:00."
      ],
      [
        "Наличност",
        "Потвърждаваме по телефона, преди да дойдеш."
      ]
    ],
    "faq": [
      {
        "q": "За коя коса е Blonde Glow Mask?",
        "a": "За руса или изрусена коса. Montibello я описва като озаряваща маска от рутината Blonde Glow."
      },
      {
        "q": "Маска или шампоан да избера?",
        "a": "Не се заменят: шампоанът мие, маската е втори продукт от същата рутина. Не си сигурна от кой имаш нужда? Питай по телефона или при посещение в салона."
      },
      {
        "q": "Какво съдържа рутината?",
        "a": "По данни на Montibello: витамин C (антиоксидант), LifeAlgae (комбинация от водорасли), UV филтър и лилави пигменти. Пълният състав на маската е на етикета."
      },
      {
        "q": "Как поръчвам Blonde Glow Mask и откъде го вземам?",
        "a": "Обади се на +359 898 66 33 15 и кажи името. Потвърждаваме наличността и цената. Вземаш го от салона, ул. Петър Райчев 18, кв. Левски, Варна, вт–пт 10:00–19:00, сб 10:00–17:00. Няма доставка и няма онлайн поръчка."
      }
    ],
    "routineNote": "От същата рутина е и шампоанът Blonde Glow Shampoo.",
    "service": {
      "label": "Балаяж във Варна",
      "href": "/uslugi/balayazh-varna",
      "text": "Ако косата е изсветлена при Снежана, маската е домашната грижа между две посещения. Балаяжът се прави с професионални продукти Montibello и Goldwell."
    }
  },
  "silver-white-shampoo": {
    "metaTitle": "Silver White Shampoo за сива коса | Montibello Варна",
    "metaDescription": "Silver White Shampoo на Montibello, 300 мл: шампоан за бяла и сива коса. Вземаш го от салон Euphoria във Варна; цена и наличност по телефона.",
    "subtitle": "за бяла и сива коса",
    "answer": "Silver White Shampoo е шампоан от рутината HOP Silver White на Montibello за бяла и сива коса, 300 мл. По данни на марката освежава цвета на бялата и сивата коса с директни пигменти и дава блясък. Взема се от салона, ул. Петър Райчев 18, Варна; цена и наличност по телефона +359 898 66 33 15.",
    "alt": "Montibello HOP Silver White Shampoo, 300 мл",
    "facts": [
      [
        "Серия",
        "HOP Silver White"
      ],
      [
        "Вид",
        "Шампоан, 300 мл"
      ],
      [
        "За коса",
        "Бяла или сива"
      ],
      [
        "Активи (по данни на Montibello)",
        "LifeAlgae с B-комплекс, директни пигменти, антиоксиданти, UV филтър"
      ],
      [
        "Вземане",
        "От салона, ул. Петър Райчев 18, кв. Левски, Варна. вт–пт 10:00–19:00, сб 10:00–17:00."
      ],
      [
        "Наличност",
        "Потвърждаваме по телефона, преди да дойдеш."
      ]
    ],
    "faq": [
      {
        "q": "За коя коса е Silver White Shampoo?",
        "a": "За бяла или сива коса. Montibello го описва като озаряващ шампоан, който подчертава и подсилва цвета ѝ."
      },
      {
        "q": "Става ли за сива коса, която не е боядисана?",
        "a": "Montibello го описва за бяла или сива коса и не уточнява дали е боядисана. Ако се колебаеш, питай по телефона."
      },
      {
        "q": "Какво съдържа?",
        "a": "По данни на Montibello: LifeAlgae с B-комплекс, директни пигменти, антиоксиданти и UV филтър. Пълният състав е на етикета на опаковката."
      },
      {
        "q": "С какво се комбинира?",
        "a": "С Silver White Rinse (балсам, 200 мл) от същата рутина."
      },
      {
        "q": "Как поръчвам Silver White Shampoo и откъде го вземам?",
        "a": "Обади се на +359 898 66 33 15 и кажи името. Потвърждаваме наличността и цената. Вземаш го от салона, ул. Петър Райчев 18, кв. Левски, Варна, вт–пт 10:00–19:00, сб 10:00–17:00. Няма доставка и няма онлайн поръчка."
      }
    ],
    "routineNote": "От същата рутина е и балсамът Silver White Rinse.",
    "service": {
      "label": "Боядисване на коса",
      "href": "/uslugi/boyadisvane-na-kosa-varna",
      "text": "Боядисването и корекцията на цвят са при Снежана с професионални бои Montibello. Шампоанът е домашната грижа между две посещения."
    }
  },
  "silver-white-rinse": {
    "metaTitle": "Silver White Rinse балсам за сива коса | Montibello Варна",
    "metaDescription": "Silver White Rinse на Montibello, 200 мл: балсам за бяла и сива коса. Вземаш го от салон Euphoria във Варна; цена и наличност по телефона.",
    "subtitle": "за бяла и сива коса",
    "answer": "Silver White Rinse е балсам от рутината HOP Silver White на Montibello за бяла и сива коса, 200 мл. По данни на марката рутината освежава цвета с директни пигменти и пази косата с антиоксиданти и UV филтър. Взема се от салона, ул. Петър Райчев 18, Варна; цена и наличност по телефона +359 898 66 33 15.",
    "alt": "Montibello HOP Silver White Rinse, 200 мл",
    "facts": [
      [
        "Серия",
        "HOP Silver White"
      ],
      [
        "Вид",
        "Балсам, 200 мл"
      ],
      [
        "За коса",
        "Бяла или сива"
      ],
      [
        "Активи на рутината (по данни на Montibello)",
        "LifeAlgae с B-комплекс, директни пигменти, антиоксиданти, UV филтър"
      ],
      [
        "Вземане",
        "От салона, ул. Петър Райчев 18, кв. Левски, Варна. вт–пт 10:00–19:00, сб 10:00–17:00."
      ],
      [
        "Наличност",
        "Потвърждаваме по телефона, преди да дойдеш."
      ]
    ],
    "faq": [
      {
        "q": "За коя коса е Silver White Rinse?",
        "a": "За бяла или сива коса. Montibello го описва като озаряващ балсам от рутината Silver White."
      },
      {
        "q": "Какво съдържа рутината?",
        "a": "По данни на Montibello: LifeAlgae с B-комплекс, директни пигменти, антиоксиданти и UV филтър. Пълният състав на балсама е на етикета."
      },
      {
        "q": "С какво се комбинира?",
        "a": "Със Silver White Shampoo (300 мл), който е от същата рутина."
      },
      {
        "q": "Как поръчвам Silver White Rinse и откъде го вземам?",
        "a": "Обади се на +359 898 66 33 15 и кажи името. Потвърждаваме наличността и цената. Вземаш го от салона, ул. Петър Райчев 18, кв. Левски, Варна, вт–пт 10:00–19:00, сб 10:00–17:00. Няма доставка и няма онлайн поръчка."
      }
    ],
    "routineNote": "От същата рутина е и шампоанът Silver White Shampoo.",
    "service": {
      "label": "Боядисване на коса",
      "href": "/uslugi/boyadisvane-na-kosa-varna",
      "text": "Снежана боядисва и коригира цвят с професионални бои Montibello. Балсамът е домашната грижа за бяла и сива коса между посещенията."
    }
  },
  "purple-reflects-shampoo": {
    "metaTitle": "Purple Reflects Shampoo за лилава коса | Montibello Варна",
    "metaDescription": "Purple Reflects Shampoo на Montibello, 300 мл: шампоан за лилава коса. Вземаш го от салон Euphoria във Варна; цена и наличност по телефона.",
    "subtitle": "за лилава коса",
    "answer": "Purple Reflects Shampoo е шампоан от серията HOP Reflects на Montibello за лилава коса, 300 мл. По данни на марката серията освежава и подсилва тоновете на естествена и боядисана коса с цветни пигменти. Взема се от салона, ул. Петър Райчев 18, Варна; цена и наличност по телефона +359 898 66 33 15.",
    "alt": "Montibello HOP Purple Reflects Shampoo, 300 мл",
    "facts": [
      [
        "Серия",
        "HOP Reflects"
      ],
      [
        "Вид",
        "Шампоан, 300 мл"
      ],
      [
        "За коса",
        "Лилава"
      ],
      [
        "Активи (по данни на Montibello)",
        "B-комплекс, LifeAlgae (комбинация от водорасли), директни пигменти, антиоксиданти, UV филтър"
      ],
      [
        "Вземане",
        "От салона, ул. Петър Райчев 18, кв. Левски, Варна. вт–пт 10:00–19:00, сб 10:00–17:00."
      ],
      [
        "Наличност",
        "Потвърждаваме по телефона, преди да дойдеш."
      ]
    ],
    "faq": [
      {
        "q": "За коя коса е Purple Reflects Shampoo?",
        "a": "За лилава коса. Montibello го описва като шампоан, който освежава цвета."
      },
      {
        "q": "Има ли шампоан Reflects за други цветове?",
        "a": "В серията Reflects има още шампоани за средно кафява, червена и медна коса. Кои са налични, потвърждаваме по телефона."
      },
      {
        "q": "Какво съдържа?",
        "a": "По данни на Montibello: B-комплекс, LifeAlgae (комбинация от водорасли), директни пигменти, антиоксиданти и UV филтър. Пълният състав е на етикета."
      },
      {
        "q": "Как поръчвам Purple Reflects Shampoo и откъде го вземам?",
        "a": "Обади се на +359 898 66 33 15 и кажи името. Потвърждаваме наличността и цената. Вземаш го от салона, ул. Петър Райчев 18, кв. Левски, Варна, вт–пт 10:00–19:00, сб 10:00–17:00. Няма доставка и няма онлайн поръчка."
      }
    ],
    "routineNote": "От серията Reflects са и шампоаните за средно кафява, червена и медна коса.",
    "service": {
      "label": "Боядисване на коса",
      "href": "/uslugi/boyadisvane-na-kosa-varna",
      "text": "Цветът се нанася в салона, при Снежана, с професионални бои Montibello. Шампоанът е домашната грижа между две посещения."
    }
  },
  "colour-last-shampoo": {
    "metaTitle": "Colour Last Shampoo за боядисана коса | Montibello Варна",
    "metaDescription": "Colour Last Shampoo на Montibello, 300 мл: шампоан за боядисана коса. Вземаш го от салон Euphoria във Варна; цена и наличност по телефона.",
    "subtitle": "за боядисана коса",
    "answer": "Colour Last Shampoo е шампоан от рутината HOP Colour Last на Montibello за боядисана коса, 300 мл. По данни на марката рутината хидратира и удължава трайността на цвета и блясъка с ферулова киселина, растителен антиоксидант. Взема се от салона, ул. Петър Райчев 18, Варна; цена и наличност по телефона +359 898 66 33 15.",
    "alt": "Montibello HOP Colour Last Shampoo, 300 мл",
    "facts": [
      [
        "Серия",
        "HOP Colour Last"
      ],
      [
        "Вид",
        "Шампоан, 300 мл"
      ],
      [
        "За коса",
        "Боядисана"
      ],
      [
        "Активи (по данни на Montibello)",
        "LifeAlgae (комбинация от водорасли), ферулова киселина (растителен антиоксидант), UV филтър"
      ],
      [
        "Вземане",
        "От салона, ул. Петър Райчев 18, кв. Левски, Варна. вт–пт 10:00–19:00, сб 10:00–17:00."
      ],
      [
        "Наличност",
        "Потвърждаваме по телефона, преди да дойдеш."
      ]
    ],
    "faq": [
      {
        "q": "За коя коса е Colour Last Shampoo?",
        "a": "За боядисана коса. Montibello го описва като шампоан от хидратираща и защитна рутина за цвят."
      },
      {
        "q": "Какво съдържа?",
        "a": "По данни на Montibello: LifeAlgae (комбинация от водорасли), ферулова киселина (растителен антиоксидант) и UV филтър. Пълният състав е на етикета на опаковката."
      },
      {
        "q": "С какво се комбинира?",
        "a": "С балсама Colour Last Rinse (200 мл) и маската Colour Last Mask (200 мл) от същата рутина."
      },
      {
        "q": "Как поръчвам Colour Last Shampoo и откъде го вземам?",
        "a": "Обади се на +359 898 66 33 15 и кажи името. Потвърждаваме наличността и цената. Вземаш го от салона, ул. Петър Райчев 18, кв. Левски, Варна, вт–пт 10:00–19:00, сб 10:00–17:00. Няма доставка и няма онлайн поръчка."
      }
    ],
    "routineNote": "След шампоана идват балсамът и маската от серията Colour Last.",
    "service": {
      "label": "Боядисване на коса",
      "href": "/uslugi/boyadisvane-na-kosa-varna",
      "text": "Боядисваме с професионални бои Montibello. Шампоанът е за вкъщи, между двата часа."
    }
  },
  "colour-last-rinse": {
    "metaTitle": "Colour Last Rinse балсам за боядисана коса | Montibello",
    "metaDescription": "Colour Last Rinse на Montibello, 200 мл: балсам за боядисана коса. Вземаш го от салон Euphoria във Варна; цена и наличност по телефона.",
    "subtitle": "за боядисана коса",
    "answer": "Colour Last Rinse е балсам от рутината HOP Colour Last на Montibello за боядисана коса, 200 мл. По данни на марката рутината пази цвета и блясъка с ферулова киселина (растителен антиоксидант) и UV филтър. Взема се от салона, ул. Петър Райчев 18, Варна; цена и наличност по телефона +359 898 66 33 15.",
    "alt": "Montibello HOP Colour Last Rinse, 200 мл",
    "facts": [
      [
        "Серия",
        "HOP Colour Last"
      ],
      [
        "Вид",
        "Балсам, 200 мл"
      ],
      [
        "За коса",
        "Боядисана"
      ],
      [
        "Активи на рутината (по данни на Montibello)",
        "LifeAlgae (комбинация от водорасли), ферулова киселина (растителен антиоксидант), UV филтър"
      ],
      [
        "Вземане",
        "От салона, ул. Петър Райчев 18, кв. Левски, Варна. вт–пт 10:00–19:00, сб 10:00–17:00."
      ],
      [
        "Наличност",
        "Потвърждаваме по телефона, преди да дойдеш."
      ]
    ],
    "faq": [
      {
        "q": "За коя коса е Colour Last Rinse?",
        "a": "За боядисана коса. Montibello го води като балсам от рутината Colour Last."
      },
      {
        "q": "Какво съдържа?",
        "a": "Montibello посочва за рутината ферулова киселина, UV филтър и LifeAlgae. Какво точно има в балсама, пише на етикета."
      },
      {
        "q": "С какво се комбинира?",
        "a": "С шампоана Colour Last Shampoo (300 мл) и маската Colour Last Mask (200 мл), и двата от същата серия."
      },
      {
        "q": "Как поръчвам Colour Last Rinse и откъде го вземам?",
        "a": "Обади се на +359 898 66 33 15 и кажи името. Потвърждаваме наличността и цената. Вземаш го от салона, ул. Петър Райчев 18, кв. Левски, Варна, вт–пт 10:00–19:00, сб 10:00–17:00. Няма доставка и няма онлайн поръчка."
      }
    ],
    "routineNote": "От серията Colour Last са още шампоанът и маската.",
    "service": {
      "label": "Боядисване на коса",
      "href": "/uslugi/boyadisvane-na-kosa-varna",
      "text": "Цветът се прави при Снежана с професионални бои Montibello, а балсамът е грижата за вкъщи след това."
    }
  },
  "colour-last-mask": {
    "metaTitle": "Colour Last Mask маска за боядисана коса | Montibello",
    "metaDescription": "Colour Last Mask на Montibello, 200 мл: маска за боядисана коса. Вземаш я от салон Euphoria във Варна; цена и наличност по телефона.",
    "subtitle": "за боядисана коса",
    "answer": "Colour Last Mask е маска от рутината HOP Colour Last на Montibello за боядисана коса, 200 мл. По данни на марката рутината е хидратираща и защитна, с ферулова киселина (растителен антиоксидант) и UV филтър. Взема се от салона, ул. Петър Райчев 18, Варна; цена и наличност по телефона +359 898 66 33 15.",
    "alt": "Montibello HOP Colour Last Mask, 200 мл",
    "facts": [
      [
        "Серия",
        "HOP Colour Last"
      ],
      [
        "Вид",
        "Маска, 200 мл"
      ],
      [
        "За коса",
        "Боядисана"
      ],
      [
        "Активи на рутината (по данни на Montibello)",
        "LifeAlgae (комбинация от водорасли), ферулова киселина (растителен антиоксидант), UV филтър"
      ],
      [
        "Вземане",
        "От салона, ул. Петър Райчев 18, кв. Левски, Варна. вт–пт 10:00–19:00, сб 10:00–17:00."
      ],
      [
        "Наличност",
        "Потвърждаваме по телефона, преди да дойдеш."
      ]
    ],
    "faq": [
      {
        "q": "За коя коса е Colour Last Mask?",
        "a": "За боядисана коса. Montibello я описва като маска от рутината Colour Last."
      },
      {
        "q": "Маска, балсам или и двете?",
        "a": "Балсамът и маската са отделни продукти от една рутина, всеки по 200 мл. Кое ти трябва, преценяваме заедно по телефона или в салона."
      },
      {
        "q": "Какво има в маската?",
        "a": "За рутината Colour Last производителят посочва LifeAlgae, комбинация от водорасли, растителния антиоксидант ферулова киселина и UV филтър. Пълният състав е на опаковката."
      },
      {
        "q": "Как поръчвам Colour Last Mask и откъде го вземам?",
        "a": "Обади се на +359 898 66 33 15 и кажи името. Потвърждаваме наличността и цената. Вземаш го от салона, ул. Петър Райчев 18, кв. Левски, Варна, вт–пт 10:00–19:00, сб 10:00–17:00. Няма доставка и няма онлайн поръчка."
      }
    ],
    "routineNote": "От серията Colour Last са още шампоанът и балсамът.",
    "service": {
      "label": "Боядисване на коса",
      "href": "/uslugi/boyadisvane-na-kosa-varna",
      "text": "Боядисването е услуга в салона, с професионални бои Montibello. Маската е допълнителна грижа за вкъщи."
    }
  },
  "full-volume-dry-shampoo": {
    "metaTitle": "Full Volume Dry Shampoo за фина коса | Montibello Варна",
    "metaDescription": "Full Volume Dry Shampoo на Montibello, 150 мл: сух шампоан за фина коса. Вземаш го от салон Euphoria във Варна; цена и наличност по телефона.",
    "subtitle": "за фина коса, за обем",
    "answer": "Full Volume Dry Shampoo е сух шампоан от рутината HOP Full Volume на Montibello за фина коса, 150 мл. По данни на марката рутината дава на фината коса естествен обем с овесени пептиди и оризов протеин. Взема се от салона, ул. Петър Райчев 18, Варна; цена и наличност по телефона +359 898 66 33 15.",
    "alt": "Montibello HOP Full Volume Dry Shampoo, 150 мл",
    "facts": [
      [
        "Серия",
        "HOP Full Volume"
      ],
      [
        "Вид",
        "Сух шампоан, 150 мл"
      ],
      [
        "За коса",
        "Фина"
      ],
      [
        "Активи на рутината (по данни на Montibello)",
        "Овесени пептиди (аминокиселини за обем и текстура), хидролизиран оризов протеин, LifeAlgae"
      ],
      [
        "Вземане",
        "От салона, ул. Петър Райчев 18, кв. Левски, Варна. вт–пт 10:00–19:00, сб 10:00–17:00."
      ],
      [
        "Наличност",
        "Потвърждаваме по телефона, преди да дойдеш."
      ]
    ],
    "faq": [
      {
        "q": "Какво е сух шампоан?",
        "a": "Сухият шампоан се нанася на сухо, без вода. Montibello го води като шампоан за обем от рутината Full Volume. Указанията са на опаковката."
      },
      {
        "q": "За коя коса е Full Volume Dry Shampoo?",
        "a": "За фина коса. Рутината Full Volume е описана като грижа, която дава на фината коса естествен обем."
      },
      {
        "q": "Какво съдържа?",
        "a": "По данни на Montibello рутината е с овесени пептиди (аминокиселини за обем и текстура), хидролизиран оризов протеин и LifeAlgae. Пълният състав е на етикета."
      },
      {
        "q": "Как поръчвам Full Volume Dry Shampoo и откъде го вземам?",
        "a": "Обади се на +359 898 66 33 15 и кажи името. Потвърждаваме наличността и цената. Вземаш го от салона, ул. Петър Райчев 18, кв. Левски, Варна, вт–пт 10:00–19:00, сб 10:00–17:00. Няма доставка и няма онлайн поръчка."
      }
    ],
    "routineNote": "От рутината Full Volume са още шампоанът и пяната-балсам.",
    "service": {
      "label": "Подстригване и оформяне",
      "href": "/uslugi/frizorski-uslugi",
      "text": "Сешоарът и оформянето са в ценоразписа на фризьорските услуги. При фина коса обемът е част от прическата, а сухият шампоан е домашна добавка."
    }
  },
  "ultra-repair-overnight-serum": {
    "metaTitle": "Ultra Repair Overnight Serum за увредена коса | Montibello",
    "metaDescription": "Ultra Repair Overnight Serum на Montibello, 100 мл: нощен серум за увредена коса. Вземаш го от салон Euphoria във Варна; цена по телефона.",
    "subtitle": "за увредена коса",
    "answer": "Ultra Repair Overnight Serum е нощен серум от рутината HOP Ultra Repair на Montibello за коса, увредена от топлина и химия, 100 мл. По данни на марката връща силата, хидратацията и мекотата на косата за една нощ. Взема се от салона, ул. Петър Райчев 18, Варна; цена и наличност по телефона +359 898 66 33 15.",
    "alt": "Montibello HOP Ultra Repair Overnight Serum, 100 мл",
    "facts": [
      [
        "Серия",
        "HOP Ultra Repair"
      ],
      [
        "Вид",
        "Нощен серум, 100 мл"
      ],
      [
        "За коса",
        "Увредена от топлина и химия"
      ],
      [
        "Активи на рутината (по данни на Montibello)",
        "Vegan Collagen (растителен протеинов комплекс), LifeAlgae (комбинация от водорасли)"
      ],
      [
        "Вземане",
        "От салона, ул. Петър Райчев 18, кв. Левски, Варна. вт–пт 10:00–19:00, сб 10:00–17:00."
      ],
      [
        "Наличност",
        "Потвърждаваме по телефона, преди да дойдеш."
      ]
    ],
    "faq": [
      {
        "q": "За коя коса е Ultra Repair Overnight Serum?",
        "a": "За коса, увредена от топлина и химия. Така Montibello описва рутината Ultra Repair, от която е серумът."
      },
      {
        "q": "Какво твърди Montibello, че прави?",
        "a": "Че връща силата, хидратацията и мекотата на косата за една нощ. Това е твърдение на производителя, по негов инструментален тест; условията на теста не са публикувани. Резултатът при теб зависи от косата."
      },
      {
        "q": "Какво съдържа?",
        "a": "Montibello посочва за рутината Vegan Collagen (растителен протеинов комплекс) и LifeAlgae (комбинация от водорасли). Пълният състав е на етикета на серума."
      },
      {
        "q": "С какво се комбинира?",
        "a": "Серумът е част от рутината Ultra Repair заедно с шампоан, балсам, маска и крем за краищата."
      },
      {
        "q": "Как поръчвам Ultra Repair Overnight Serum и откъде го вземам?",
        "a": "Обади се на +359 898 66 33 15 и кажи името. Потвърждаваме наличността и цената. Вземаш го от салона, ул. Петър Райчев 18, кв. Левски, Варна, вт–пт 10:00–19:00, сб 10:00–17:00. Няма доставка и няма онлайн поръчка."
      }
    ],
    "routineNote": "От рутината Ultra Repair са още шампоанът, балсамът, маската и кремът за краищата.",
    "service": {
      "label": "Терапии за коса",
      "href": "/uslugi/frizorski-terapii",
      "text": "Терапиите в салона са с Kerasilk (Goldwell) и Nashi Argan; серумът е за вкъщи и не е част от тях. Увредена коса? Питай Снежана при посещение."
    }
  },
  "detox-cleansing-shampoo": {
    "metaTitle": "Detox Cleansing Shampoo за мазен скалп | Montibello Варна",
    "metaDescription": "Detox Cleansing Shampoo на Montibello, 300 мл: шампоан за мазен скалп. Вземаш го от салон Euphoria във Варна; цена и наличност по телефона.",
    "subtitle": "за мазен скалп",
    "answer": "Detox Cleansing Shampoo е шампоан от рутината HOP Detox на Montibello за скалп и коса с излишна мазнина и замърсявания, 300 мл. По данни на марката почиства скалпа и косата, а глината поема излишната мазнина. Взема се от салона, ул. Петър Райчев 18, Варна; цена и наличност по телефона +359 898 66 33 15.",
    "alt": "Montibello HOP Detox Cleansing Shampoo, 300 мл",
    "facts": [
      [
        "Серия",
        "HOP Detox"
      ],
      [
        "Вид",
        "Шампоан за дълбоко почистване, 300 мл"
      ],
      [
        "За коса",
        "Скалп и коса с излишна мазнина и замърсявания"
      ],
      [
        "Активи (по данни на Montibello)",
        "LifeAlgae с пребиотици и постбиотици, глина, сарказин (аминокиселина)"
      ],
      [
        "Вземане",
        "От салона, ул. Петър Райчев 18, кв. Левски, Варна. вт–пт 10:00–19:00, сб 10:00–17:00."
      ],
      [
        "Наличност",
        "Потвърждаваме по телефона, преди да дойдеш."
      ]
    ],
    "faq": [
      {
        "q": "За какъв скалп е Detox Cleansing Shampoo?",
        "a": "За скалп и коса с излишна мазнина и замърсявания. Montibello го описва като шампоан, който почиства и освежава."
      },
      {
        "q": "Подходящ ли е при пърхот?",
        "a": "Montibello не го описва като средство против пърхот. Detox е за мазен скалп. За скалп, склонен към пърхот, марката има друга рутина, Purifying Balance."
      },
      {
        "q": "Какво съдържа?",
        "a": "По данни на Montibello: LifeAlgae с пребиотици и постбиотици, глина, която поема излишната мазнина, и сарказин, аминокиселина, която регулира отделянето на себум. Пълният състав е на етикета."
      },
      {
        "q": "С какво се комбинира?",
        "a": "С Scalp Detox Cleansing Treatment (балансираща терапия за скалп, 200 мл) от същата рутина."
      },
      {
        "q": "Как поръчвам Detox Cleansing Shampoo и откъде го вземам?",
        "a": "Обади се на +359 898 66 33 15 и кажи името. Потвърждаваме наличността и цената. Вземаш го от салона, ул. Петър Райчев 18, кв. Левски, Варна, вт–пт 10:00–19:00, сб 10:00–17:00. Няма доставка и няма онлайн поръчка."
      }
    ],
    "routineNote": "От рутината Detox е и терапията Scalp Detox Cleansing Treatment.",
    "service": {
      "label": "Подстригване и оформяне",
      "href": "/uslugi/frizorski-uslugi",
      "text": "Подстригването включва измиване. При посещение попитай дали Detox е за твоя скалп; това е козметика, не лечение."
    }
  },
  "decode-curl": {
    "metaTitle": "Decode Curl за къдрава коса | Montibello Варна",
    "metaDescription": "Decode Curl на Montibello: Curl Creator и Curl Definer, 150 мл, за къдрава коса. Вземаш ги от салон Euphoria във Варна; цена по телефона.",
    "subtitle": "за къдрава коса",
    "answer": "Decode Curl е линия за къдрава коса от гамата за оформяне Decode на Montibello. В нея има два продукта по 150 мл: Curl Creator, активиращ балсам за къдрици, и Curl Definer, дефиниращ балсам. Взема се от салона, ул. Петър Райчев 18, Варна; цена и наличност по телефона +359 898 66 33 15.",
    "alt": "Montibello Decode Curl: Curl Creator и Curl Definer",
    "facts": [
      [
        "Линия",
        "Decode Curl"
      ],
      [
        "Вид",
        "Стайлинг за къдрици: Curl Creator и Curl Definer, по 150 мл"
      ],
      [
        "За коса",
        "Къдрава"
      ],
      [
        "Активи",
        "Montibello не ги публикува на страницата на линията; пълният състав е на етикета"
      ],
      [
        "Вземане",
        "От салона, ул. Петър Райчев 18, кв. Левски, Варна. вт–пт 10:00–19:00, сб 10:00–17:00."
      ],
      [
        "Наличност",
        "Потвърждаваме по телефона, преди да дойдеш."
      ]
    ],
    "faq": [
      {
        "q": "За коя коса е Decode Curl?",
        "a": "За къдрава коса. Montibello описва линията с думите „максимална мекота, подхранване и гъвкавост“."
      },
      {
        "q": "Каква е разликата между Curl Creator и Curl Definer?",
        "a": "Montibello води Curl Creator като активиращ балсам за къдрици, а Curl Definer като дефиниращ балсам. Кой е за твоите къдрици, питай по телефона."
      },
      {
        "q": "Какво е Decode?",
        "a": "Decode е гамата на Montibello за оформяне и финиш: дефиниция, фиксация, текстура и блясък. Curl е една от нейните линии."
      },
      {
        "q": "Как поръчвам Decode Curl и откъде го вземам?",
        "a": "Обади се на +359 898 66 33 15 и кажи името. Потвърждаваме наличността и цената. Вземаш го от салона, ул. Петър Райчев 18, кв. Левски, Варна, вт–пт 10:00–19:00, сб 10:00–17:00. Няма доставка и няма онлайн поръчка."
      }
    ],
    "routineNote": "От гамата Decode са още линиите за изправяне, финиш, обем и текстура.",
    "service": {
      "label": "Подстригване и оформяне",
      "href": "/uslugi/frizorski-uslugi",
      "text": "В ценоразписа има навиване с преса или букли за обем и къдри. Decode Curl е за оформяне вкъщи."
    }
  },
};
