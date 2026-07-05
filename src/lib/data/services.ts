export type Currency = "лв" | "€";

export interface ServiceItem {
  name: string;
  price: number;
  priceFrom?: boolean;
  priceMax?: number;
  currency: Currency;
  duration?: string;
  description?: string;
}

export interface ServiceGroup {
  title: string;
  items: ServiceItem[];
}

export interface ServiceCategory {
  slug: string;
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  longDescription: string;
  icon: "scissors" | "sparkles" | "hand-heart" | "flower";
  heroImage: string;
  /** Кратки SEO-ориентирани имена на популярни подуслуги — за home page hint */
  popular: string[];
  /** SEO H1 — "X във Варна — ..." style */
  seoTitle: string;
  /** <title> таг 45–48 зн. с гео keywords (template добавя " · Euphoria"); fallback: title */
  metaTitle?: string;
  /** Meta description 150–160 зн. с Варна + кв. Левски + онлайн записване; fallback: description */
  metaDescription?: string;
  groups: ServiceGroup[];
  featured: ServiceItem[];
}

export const serviceCategories: ServiceCategory[] = [
  {
    slug: "frizorski-uslugi",
    title: "Фризьорски Услуги",
    shortTitle: "Фризьор",
    tagline: "Подстригване и оформяне за всякакви стилове и дължини",
    description:
      "Класически и модерни прически, боядисване, балаяж, кичури и официални прически.",
    longDescription:
      "Работим с продукти на Montibello и Goldwell и владеем съвременните техники за балаяж, омбре и кичури. Правим и официални прически за сватби, балове и абитуриентски.",
    icon: "scissors",
    heroImage: "/images/services/unique/balayazh-sredna-kosa.webp",
    seoTitle: "Фризьорски услуги във Варна — стил и качество от професионалисти",
    popular: ["Балаяж", "Кичури на фолио", "Подстригване", "Официална прическа", "Корекция на цвят"],
    groups: [
      {
        title: "Подстригване и оформяне",
        items: [
          { name: "Дамско подстригване (дълга коса)", price: 30, currency: "€", description: "Включва измиване и сешоар" },
          { name: "Дамско подстригване (къса коса)", price: 25, currency: "€", description: "Включва измиване и сешоар" },
          { name: "Мъжко подстригване", price: 20, currency: "€", description: "Включва измиване" },
          { name: "Сешоар (къса коса)", price: 25, priceFrom: true, currency: "€" },
          { name: "Сешоар (дълга коса)", price: 30, priceFrom: true, currency: "€" },
          { name: "Навиване с преса/букли", price: 40, currency: "€", description: "За обем и красиви къдрици" },
          { name: "Ретро вълни", price: 40, currency: "€", description: "Елегантен винтидж стил" },
          { name: "Официална прическа", price: 80, priceFrom: true, currency: "€", description: "За сватби, балове, тържества" },
          { name: "Рибена кост плитка", price: 10, currency: "€" },
          { name: "Обикновена плитка", price: 5, currency: "€" },
        ],
      },
      {
        title: "Боядисване и кичури",
        items: [
          { name: "Боядисване", price: 20, priceFrom: true, priceMax: 30, currency: "€", description: "Включва прическа и боя" },
          { name: "Корекция на цветовете", price: 75, priceFrom: true, currency: "€", description: "Поправка на неуспешно боядисване" },
          { name: "Балаяж", price: 185, currency: "€", description: "Включва прическа и боя" },
          { name: "Кичури на фолио", price: 65, priceFrom: true, currency: "€", description: "Включва прическа и боя" },
          { name: "Боя на салона 60мл", price: 25, currency: "€", description: "Montibello, Goldwell" },
        ],
      },
    ],
    featured: [
      { name: "Балаяж", price: 185, currency: "€" },
      { name: "Дамско подстригване", price: 30, currency: "€", priceFrom: true },
      { name: "Официална прическа", price: 80, priceFrom: true, currency: "€" },
    ],
  },
  {
    slug: "frizorski-terapii",
    title: "Фризьорски Терапии",
    shortTitle: "Терапии",
    tagline: "Кератин, аргана и минерали за коса след боядисване или избелване",
    description:
      "Терапии за възстановяване, хидратация и блясък: кератин, минерали, ламеларна вода и ампули Nashi Argan.",
    longDescription:
      "Работим с професионални продукти за дълбоко подхранване: кератин, минерали и ламеларна вода. Терапията избираме според състоянието на косата ти.",
    icon: "sparkles",
    heroImage: "/images/services/unique/keratinova-terapiya-kerasilk-goldwell.webp",
    seoTitle: "Фризьорски терапии във Варна — възстановяване, хидратация и блясък",
    popular: ["Kerasilk кератин", "Nashi Argan", "Ламеларна вода", "Минерални ампули"],
    groups: [
      {
        title: "Терапии за коса",
        items: [
          {
            name: "Кератинова терапия Kerasilk (Goldwell)",
            price: 80,
            currency: "лв",
            description: "Метод за изправяне и подхранване — гладка, мека и без наелектризирания коса",
          },
          {
            name: "Ампули Nashi Argan",
            price: 20,
            currency: "лв",
            description: "Подхранват, възстановяват и защитават косата в дълбочина с дълготрайна хидратация",
          },
          {
            name: "Ламеларна вода",
            price: 15,
            currency: "лв",
            description: "Премахва замърсяванията, оставяйки влага и блясък",
          },
          {
            name: "Минерални ампули",
            price: 5,
            currency: "лв",
            description: "Минерали за здравина и блясък на косата",
          },
        ],
      },
    ],
    featured: [
      { name: "Kerasilk Keratin", price: 80, currency: "лв" },
      { name: "Nashi Argan", price: 20, currency: "лв" },
      { name: "Ламеларна вода", price: 15, currency: "лв" },
    ],
  },
  {
    slug: "manikyur-i-pedikyur",
    title: "Маникюр и Педикюр",
    shortTitle: "Маникюр",
    tagline: "Форма и цвят, които издържат седмици",
    description: "Класически маникюр, gel лак, френски/омбре дизайни, кератинови терапии за нокти и медицински педикюр.",
    longDescription:
      "Маникюр и педикюр в стерилни условия, с форма, която издържа седмици. От естествени френски дизайни до по-сложна декорация, според това какво искаш.",
    icon: "hand-heart",
    heroImage: "/images/services/unique/manikyur-s-gel-lak.webp",
    seoTitle: "Маникюр и педикюр във Варна — грижа за ръцете и краката ти",
    popular: ["Гел маникюр", "Френски / омбре", "Класически педикюр", "Кератинова терапия", "Медицински педикюр"],
    groups: [
      {
        title: "Маникюр",
        items: [
          { name: "Класически маникюр", price: 25, currency: "лв", description: "Оформяне на нокти, почистване на кутикули, възстановяващо масло/заздравител" },
          { name: "Маникюр с обикновен лак", price: 30, currency: "лв" },
          { name: "Маникюр с гел лак", price: 40, currency: "лв" },
          { name: "Френски/омбре маникюр", price: 45, currency: "лв", description: "С гел лак" },
          { name: "Кератинова терапия за нокти", price: 30, currency: "лв" },
          { name: "Кератинова терапия под гел", price: 8, currency: "лв" },
          { name: "Подхранваща терапия за ръце SNB", price: 30, currency: "лв" },
        ],
      },
      {
        title: "Педикюр",
        items: [
          { name: "Класически педикюр", price: 40, currency: "лв", description: "Обработка на нокти, почистване на ходила, възстановяващо масло/заздравител" },
          { name: "Педикюр с обикновен лак", price: 45, currency: "лв" },
          { name: "Педикюр с гел лак", price: 50, currency: "лв" },
          { name: "Френски/омбре педикюр", price: 55, currency: "лв" },
          { name: "Оформяне на нокти", price: 25, currency: "лв" },
          { name: "Оформяне с гел лак", price: 45, currency: "лв" },
          { name: "Почистване на ходила", price: 25, currency: "лв" },
        ],
      },
    ],
    featured: [
      { name: "Френски/омбре маникюр", price: 45, currency: "лв" },
      { name: "Педикюр с гел лак", price: 50, currency: "лв" },
      { name: "Класически маникюр", price: 25, currency: "лв" },
    ],
  },
  {
    slug: "kozmetika",
    title: "Козметика",
    shortTitle: "Козметика",
    tagline: "Лицеви протоколи според типа кожа: почистване, anti-age, ламиниране",
    description:
      "Лицеви терапии според типа кожа: почистване, хидратация, anti-age, ламиниране и епилация с марки GIGI, Montibello и Esthemax.",
    longDescription:
      "Козметичният кабинет работи с GIGI, Esthemax, Montibello и SAN MARINE. Протоколът се избира според типа кожа, възрастта и желания резултат — от почистване и хидратация до anti-age процедури.",
    icon: "flower",
    heroImage: "/images/services/unique/hydra-facial-pochistvane.webp",
    seoTitle: "Козметични услуги във Варна — грижа за кожата и лицето ти",
    popular: ["Hydra Facial", "Микронидлинг", "BIOREPEELCL3 пилинг", "GOYUKI японски лифтинг", "Ламиниране мигли"],
    groups: [
      {
        title: "Почистване на лице",
        items: [
          { name: "Ултразвуково почистване", price: 70, currency: "лв", description: "Дълбоко почистване чрез ултразвук, премахва замърсявания" },
          { name: "Стандартно почистване", price: 70, currency: "лв", description: "Нежно почистване, възстановява естествения блясък" },
          { name: "Комбинирано (GIGI, Esthemax, Montibello)", price: 70, currency: "лв" },
          { name: "Hydra facial почистване", price: 100, currency: "лв", description: "Модерно почистване, хидратира и ексфолира" },
          { name: "Водно дермаабразио", price: 100, currency: "лв" },
          { name: "Аква пилинг", price: 100, currency: "лв" },
        ],
      },
      {
        title: "Терапии за лице",
        items: [
          { name: "BIOREPEELCL3 биостимулиращ пилинг", price: 120, currency: "лв", description: "Подмладяващ пилинг, възстановява кожата" },
          { name: "Тотална хидратация с пептиди GIGI", price: 90, currency: "лв" },
          { name: "ALUDE тотален лифтинг Montibello", price: 110, currency: "лв" },
          { name: "Detox City Nap GIGI", price: 100, currency: "лв" },
          { name: "OXYGEN инфузия Montibello", price: 90, currency: "лв" },
          { name: "Bioplasma с азелаинова киселина GIGI", price: 90, currency: "лв" },
          { name: "HYALOFUUL Montibello", price: 90, currency: "лв" },
          { name: "RETIDERM ретинол + Вит. C Montibello", price: 100, currency: "лв" },
          { name: "Acnon анти акне GIGI", price: 90, currency: "лв" },
          { name: "Ester C анти пигмент", price: 100, currency: "лв" },
          { name: "Анти ейдж криотерапия Esthemax", price: 90, currency: "лв" },
          { name: "Безиглена мезотерапия с хиалурон", price: 90, currency: "лв" },
          { name: "Лифтинг с колаген + LED", price: 100, currency: "лв" },
          { name: "BIO лифтинг SAN MARINE", price: 100, currency: "лв" },
          { name: "Карбокси терапия GENOSYS", price: 90, currency: "лв" },
          { name: "Микронидлинг", price: 120, currency: "лв", description: "Терапия с микроигли, стимулира регенерацията" },
          { name: "Био колагенови конци SAN MARINE", price: 100, currency: "лв" },
        ],
      },
      {
        title: "Японски масаж на лице",
        items: [
          { name: "GOYUKI лифтинг (90 мин)", price: 60, currency: "лв", duration: "90 мин", description: "Релаксиращ масаж с подмладяващ и стягащ ефект" },
        ],
      },
      {
        title: "Ламиниране",
        items: [
          { name: "Ламиниране мигли", price: 70, currency: "лв" },
          { name: "Ламиниране вежди", price: 70, currency: "лв" },
        ],
      },
      {
        title: "Епилация и оформяне",
        items: [
          { name: "½ ръце", price: 15, currency: "лв" },
          { name: "Цели ръце", price: 20, currency: "лв" },
          { name: "Горна устна", price: 5, currency: "лв" },
          { name: "Подмишници", price: 15, currency: "лв" },
          { name: "½ крака", price: 20, currency: "лв" },
          { name: "Цели крака", price: 35, currency: "лв" },
          { name: "Оформяне вежди", price: 8, priceFrom: true, priceMax: 10, currency: "лв" },
          { name: "Боядисване вежди", price: 5, currency: "лв" },
        ],
      },
    ],
    featured: [
      { name: "BIOREPEELCL3 пилинг", price: 120, currency: "лв" },
      { name: "Микронидлинг", price: 120, currency: "лв" },
      { name: "Hydra facial", price: 100, currency: "лв" },
    ],
  },
];

export function getServiceBySlug(slug: string) {
  return serviceCategories.find((c) => c.slug === slug);
}
