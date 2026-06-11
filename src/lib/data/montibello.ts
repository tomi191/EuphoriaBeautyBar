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
      "Шампоани, маски, балсами и серуми за ежедневна и интензивна грижа. Основната линия е HOP — биотехнология от водорасли (LifeAlgae) с активи според нуждата на косата и скалпа.",
  },
  {
    slug: "boyadisvane",
    title: "Боядисване",
    shortTitle: "Цвят",
    description:
      "Трайните оксидативни бои Cromatone — технически продукти само за професионална употреба. Прилагат се от майстор в салона след диагностика.",
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
      "Decode — гамата за оформяне и финиш: дефиниция, фиксация, текстура и блясък, с под-линии за къдрици, изправяне, обем и мъжки стайлинг.",
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
    officialImage: "/images/montibello/ultra-repair-shampoo.jpg",
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
    officialImage: "/images/montibello/ultra-repair-rinse.jpg",
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
    officialImage: "/images/montibello/ultra-repair-mask.jpg",
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
    officialImage: "/images/montibello/ultra-repair-overnight-serum.jpg",
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
    officialImage: "/images/montibello/colour-last-shampoo.jpg",
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
    officialImage: "/images/montibello/colour-last-rinse.jpg",
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
    officialImage: "/images/montibello/colour-last-mask.jpg",
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
    officialImage: "/images/montibello/smooth-hydration-shampoo.jpg",
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
    officialImage: "/images/montibello/smooth-hydration-rinse.jpg",
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
    officialImage: "/images/montibello/smooth-hydration-mask.jpg",
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
    officialImage: "/images/montibello/full-volume-shampoo.jpg",
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
    officialImage: "/images/montibello/full-volume-foam-rinse.jpg",
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
    officialImage: "/images/montibello/full-volume-dry-shampoo.jpg",
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
    officialImage: "/images/montibello/sun-care-restorative-shampoo.jpg",
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
    officialImage: "/images/montibello/sun-care-restorative-mask.jpg",
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
    officialImage: "/images/montibello/sun-care-defence-mist.jpg",
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
    officialImage: "/images/montibello/detox-cleansing-shampoo.jpg",
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
    officialImage: "/images/montibello/scalp-detox-cleansing-treatment.jpg",
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
    officialImage: "/images/montibello/sensitive-protection-shampoo.jpg",
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
    officialImage: "/images/montibello/sensitive-protection-scalp-serum.jpg",
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
    officialImage: "/images/montibello/purifying-balance-shampoo.jpg",
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
    officialImage: "/images/montibello/purifying-balance-scalp-treatment.jpg",
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
    officialImage: "/images/montibello/blonde-glow-shampoo.jpg",
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
    officialImage: "/images/montibello/blonde-glow-mask.jpg",
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
    officialImage: "/images/montibello/silver-white-shampoo.jpg",
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
    officialImage: "/images/montibello/silver-white-rinse.jpg",
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
    officialImage: "/images/montibello/brown-reflects-shampoo.jpg",
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
    officialImage: "/images/montibello/red-reflects-shampoo.jpg",
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
    officialImage: "/images/montibello/copper-reflects-shampoo.jpg",
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
    officialImage: "/images/montibello/purple-reflects-shampoo.jpg",
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
    officialImage: "/images/montibello/smoothing-concentrate.jpg",
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
    officialImage: "/images/montibello/colour-concentrate.jpg",
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
    officialImage: "/images/montibello/intensifier-fine-to-medium.jpg",
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
    officialImage: "/images/montibello/intensifier-medium-to-coarse.jpg",
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
    officialImage: "/images/montibello/recharge-strength.jpg",
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
    officialImage: "/images/montibello/cromatone.jpg",
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
    officialImage: "/images/montibello/cromaxtrem.jpg",
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
    officialImage: "/images/montibello/cromatone-meteorites.jpg",
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
    officialImage: "/images/montibello/cromatone-metallics.jpg",
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
    officialImage: "/images/montibello/oxibel-activating-cream.jpg",
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
      "Decode е цялата стайлинг гама: дефиниция, фиксация, текстура и блясък за всяка прическа. Продуктите оформят, но и пазят косата, докато го правят.\n\nРазделена е на под-линии - Zero, Curl, Smooth, Finish, Volume, Texture и Texture Men.",
    officialImage: "/images/montibello/decode.jpg",
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
    officialImage: "/images/montibello/decode-curl.jpg",
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
    officialImage: "/images/montibello/decode-smooth.png",
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
    officialImage: "/images/montibello/decode-finish.jpg",
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
    officialImage: "/images/montibello/decode-volume.jpg",
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
    officialImage: "/images/montibello/decode-texture.jpg",
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
    officialImage: "/images/montibello/decode-texture-men.jpg",
    accent: "ink",
  },
];

export function getMontibelloProduct(slug: string): MontibelloProduct | undefined {
  return montibelloProducts.find((p) => p.slug === slug);
}

export function productsByCategory(categorySlug: string): MontibelloProduct[] {
  return montibelloProducts.filter((p) => p.categorySlug === categorySlug);
}
