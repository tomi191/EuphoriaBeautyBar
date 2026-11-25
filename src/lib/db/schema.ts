import { pgTable, text, integer, bigint, real, boolean, timestamp, jsonb, date, unique, index, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { mode: "date", withTimezone: true });

/* ──────────────────────────────────────
 * Better Auth tables
 * ────────────────────────────────────── */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("admin"),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: ts("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  refreshTokenExpiresAt: ts("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const passkey = pgTable("passkey", {
  id: text("id").primaryKey(),
  name: text("name"),
  publicKey: text("public_key").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  credentialID: text("credential_id").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceType: text("device_type").notNull(),
  backedUp: boolean("backed_up").notNull().default(false),
  transports: text("transports"),
  createdAt: ts("created_at").$defaultFn(() => new Date()),
  aaguid: text("aaguid"),
});

/* ──────────────────────────────────────
 * CMS таблици
 * ────────────────────────────────────── */
export const teamMembers = pgTable("team_members", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  bio: text("bio").notNull(),
  image: text("image"),
  experience: text("experience").notNull(),
  specialties: jsonb("specialties").notNull().$type<string[]>(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
});

export const serviceCategories = pgTable("service_categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  shortTitle: text("short_title").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  longDescription: text("long_description").notNull(),
  icon: text("icon").notNull(),
  heroImage: text("hero_image").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
});

export const serviceItems = pgTable("service_items", {
  id: text("id").primaryKey(),
  categoryId: text("category_id")
    .notNull()
    .references(() => serviceCategories.id, { onDelete: "cascade" }),
  groupTitle: text("group_title").notNull(),
  name: text("name").notNull(),
  price: real("price").notNull(),
  priceMax: real("price_max"),
  priceFrom: boolean("price_from").notNull().default(false),
  currency: text("currency").notNull().default("лв"),
  duration: text("duration"),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  durationMin: integer("duration_min").notNull().default(60),
  bufferMin: integer("buffer_min").notNull().default(15),
  bookableOnline: boolean("bookable_online").notNull().default(true),
  activeMin: integer("active_min").notNull().default(0),
  processingMin: integer("processing_min").notNull().default(0),
});

export const testimonials = pgTable("testimonials", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  service: text("service").notNull(),
  rating: integer("rating").notNull().default(5),
  quote: text("quote").notNull(),
  initials: text("initials").notNull(),
  source: text("source").notNull().default("manual"),
  approved: boolean("approved").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
});

export const faqItems = pgTable("faq_items", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const blogPosts = pgTable("blog_posts", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  category: text("category").notNull(),
  cover: text("cover"),
  // Публичен URL на TTS аудиото (Edge TTS → Supabase Storage bucket blog-audio).
  // Може да е null, ако озвучаването не е генерирано/се е провалило.
  audioUrl: text("audio_url"),
  contentJson: jsonb("content_json").notNull().$type<unknown[]>(),
  publishedAt: ts("published_at").notNull(),
  readingMinutes: integer("reading_minutes").notNull().default(5),
  status: text("status").notNull().default("published"),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
});

export const galleryImages = pgTable("gallery_images", {
  id: text("id").primaryKey(),
  src: text("src").notNull(),
  alt: text("alt").notNull(),
  category: text("category").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  // FK към resources се налага на ниво БД (forward-reference в Drizzle би счупил подредбата на дефинициите тук).
  resourceId: text("resource_id"),
  // Свободен текст от админа — показва се под снимката в lightbox-а на /galeriya.
  description: text("description"),
  // Снимки от приложението за екипа (№8 В1а, миграция drizzle/manual/0002_staff_gallery.sql).
  // Старите редове: status = "approved", другите нови колони са празни. FK-тата са на ниво БД.
  uploadedBy: text("uploaded_by"), // resources.id на специалиста, който я е качил
  // pending: само при специалиста и в администрацията (src = ""); approved: на сайта; rejected: върната.
  status: text("status").notNull().default("approved").$type<"pending" | "approved" | "rejected">(),
  rejectReason: text("reject_reason"),
  rejectedAt: ts("rejected_at"),
  noFaceConfirmedAt: ts("no_face_confirmed_at"),
  staffNote: text("staff_note"), // думите на специалиста, до 60 знака
  serviceItemId: text("service_item_id"),
  bookingId: text("booking_id"),
  originalPath: text("original_path"), // в частното хранилище gallery-originals, без знак
  approvedBy: text("approved_by"), // user.id на администратора
  approvedAt: ts("approved_at"),
  createdAt: ts("created_at"),
});

export const googleReviews = pgTable("google_reviews", {
  id: text("id").primaryKey(),
  authorName: text("author_name").notNull(),
  authorPhoto: text("author_photo"),
  rating: integer("rating").notNull(),
  text: text("text").notNull(),
  language: text("language"),
  publishedAt: ts("published_at").notNull(),
  fetchedAt: ts("fetched_at").notNull().$defaultFn(() => new Date()),
});

export const rentalPositions = pgTable(
  "rental_positions",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    type: text("type").notNull(),
    description: text("description").notNull(),
    skills: jsonb("skills").notNull().$type<string[]>(),
    // Старите четци (/karieri, ботът) гледат само active; новите действия го държат = (status === "published").
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
    // Обявата (№8 Б, миграция drizzle/manual/0001_rental_listings.sql). Всички са празни при старите редове.
    categoryId: text("category_id").references(() => serviceCategories.id, { onDelete: "set null" }),
    serviceIds: jsonb("service_ids").notNull().default([]).$type<string[]>(), // service_items.id
    slug: text("slug"), // /karieri/<slug>; уникален (индекс долу)
    image: text("image"),
    benefits: jsonb("benefits").notNull().default([]).$type<string[]>(), // ключове от lib/rental/benefits.ts
    adminNote: text("admin_note"), // само за администратора: НИКОГА в публичните четения
    // null = стар ред отпреди обявите: важи active (active → публикувана, иначе спряна).
    status: text("status").$type<"draft" | "published" | "filled" | "paused">(),
    // FK към resources (on delete set null) се налага на ниво БД, като при gallery_images.
    filledByResourceId: text("filled_by_resource_id"),
    publishedAt: ts("published_at"),
    filledAt: ts("filled_at"),
    fbPostId: text("fb_post_id"),
    fbPostedAt: ts("fb_posted_at"),
    // Наемът на месец (сумата в €) и ключът «показвай в обявата». Изключен ключ → сумата не излиза публично.
    rentText: text("rent_text"),
    rentPublic: boolean("rent_public").notNull().default(false),
    // Свои редове в «Какво получаваш» (текстът на Снежана, до 60 знака): в обявата са без дясна част.
    customBenefits: jsonb("custom_benefits").notNull().default([]).$type<string[]>(),
  },
  (t) => [
    uniqueIndex("rental_positions_slug_uq").on(t.slug),
    index("rental_positions_status_idx").on(t.status),
    index("rental_positions_filled_by_idx").on(t.filledByResourceId),
  ],
);

// Запитванията от обявата (миграция drizzle/manual/0001_rental_listings.sql). Лични данни: само за
// администратора, трият се сами 6 месеца след created_at (lib/rental/inquiry-purge.ts).
export const rentalInquiries = pgTable(
  "rental_inquiries",
  {
    id: text("id").primaryKey(),
    positionId: text("position_id")
      .notNull()
      .references(() => rentalPositions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(), // каноничен вид +359…
    specialty: text("specialty"),
    message: text("message"),
    consentAt: ts("consent_at").notNull(),
    createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
    status: text("status").notNull().default("new").$type<"new" | "handled">(),
    handledAt: ts("handled_at"),
    clientToken: text("client_token").notNull(), // двойно натискане → един ред
    ipHash: text("ip_hash"),
    notifyLog: jsonb("notify_log").$type<Record<string, unknown>>(),
  },
  (t) => [
    uniqueIndex("rental_inquiries_client_token_uq").on(t.clientToken),
    index("rental_inquiries_position_idx").on(t.positionId),
    index("rental_inquiries_created_idx").on(t.createdAt),
    index("rental_inquiries_phone_created_idx").on(t.phone, t.createdAt),
    index("rental_inquiries_ip_created_idx").on(t.ipHash, t.createdAt),
  ],
);

/* ──────────────────────────────────────
 * Booking система
 * ────────────────────────────────────── */
export const resources = pgTable("resources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // hair | nails | cosmetics
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  color: text("color"),
  image: text("image"),
  bio: text("bio"),
  phone: text("phone"), // личен телефон за връзка — показва се при изключен онлайн запис
  telegramChatId: text("telegram_chat_id"), // Telegram chat за известия (null = несвързан)
  telegramLinkToken: text("telegram_link_token"), // еднократен код за свързване през /start
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
});

export const workingHours = pgTable("working_hours", {
  weekday: integer("weekday").primaryKey(), // 0=неделя .. 6=събота
  openTime: text("open_time"), // "09:00"
  closeTime: text("close_time"),
  closed: boolean("closed").notNull().default(false),
});

// Услуги, които конкретен изпълнител предлага — със собствена цена и продължителност.
export const resourceServices = pgTable("resource_services", {
  id: text("id").primaryKey(),
  resourceId: text("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
  serviceItemId: text("service_item_id").notNull().references(() => serviceItems.id, { onDelete: "cascade" }),
  price: real("price").notNull(),
  priceMax: real("price_max"),
  priceFrom: boolean("price_from").notNull().default(false),
  currency: text("currency").notNull().default("€"),
  durationMin: integer("duration_min").notNull().default(30),
  bufferMin: integer("buffer_min").notNull().default(10),
  active: boolean("active").notNull().default(true), // „Предлагам" — в публичния ценоразпис
  onlineBookable: boolean("online_bookable").notNull().default(true), // приема онлайн часове (иначе → телефон)
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
});

// Дневник на цените (№11, решение 25; ЗЗП чл. 65, ал. 2). Само добавяне. Пише го тригер от
// drizzle/manual/0003_price_log.sql при всяка смяна на цена в resource_services и service_items;
// кой и откъде се подава с withPriceLog (src/lib/pricing/price-log.ts). Кодът само чете.
export const priceLog = pgTable(
  "price_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    tableName: text("table_name").notNull(), // resource_services | service_items
    rowId: text("row_id").notNull(),
    serviceItemId: text("service_item_id").notNull(),
    resourceId: text("resource_id"), // null = каталожна цена
    event: text("event").notNull(), // start | insert | update
    oldPrice: real("old_price"),
    newPrice: real("new_price").notNull(),
    oldPriceMax: real("old_price_max"),
    newPriceMax: real("new_price_max"),
    oldPriceFrom: boolean("old_price_from"),
    newPriceFrom: boolean("new_price_from").notNull(),
    oldCurrency: text("old_currency"),
    newCurrency: text("new_currency").notNull(),
    changedAt: ts("changed_at").notNull().defaultNow(),
    changedBy: text("changed_by"),
    source: text("source").notNull(), // staff_app | admin | script | direct | migration
  },
  (t) => [
    index("price_log_row_idx").on(t.tableName, t.rowId, t.changedAt),
    index("price_log_offer_idx").on(t.serviceItemId, t.resourceId, t.changedAt),
  ],
);

// Собствено работно време на изпълнител по ден (fallback към салонното working_hours).
export const resourceWorkingHours = pgTable("resource_working_hours", {
  id: text("id").primaryKey(),
  resourceId: text("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(), // 0=неделя .. 6=събота
  openTime: text("open_time"),
  closeTime: text("close_time"),
  closed: boolean("closed").notNull().default(false),
});

export const timeOff = pgTable("time_off", {
  id: text("id").primaryKey(),
  resourceId: text("resource_id").references(() => resources.id, { onDelete: "cascade" }), // null = салонно
  startAt: ts("start_at").notNull(),
  endAt: ts("end_at").notNull(),
  reason: text("reason"),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
});

export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  verifyToken: text("verify_token"),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
});

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  resourceId: text("resource_id")
    .notNull()
    .references(() => resources.id, { onDelete: "restrict" }),
  serviceItemId: text("service_item_id").references(() => serviceItems.id, { onDelete: "set null" }),
  serviceName: text("service_name").notNull(),
  clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
  startAt: ts("start_at").notNull(),
  endAt: ts("end_at").notNull(),
  status: text("status").notNull().default("pending"),
  activeMin: integer("active_min").notNull().default(0),
  processingMin: integer("processing_min").notNull().default(0),
  allowParallel: boolean("allow_parallel").notNull().default(false),
  source: text("source").notNull().default("online"), // online | phone | walkin
  // Снимка на цената (€) към момента на записване - за оборот статистиката. NULL при стари часове.
  priceEur: real("price_eur"),
  notes: text("notes"),
  consentLate: boolean("consent_late").notNull().default(false),
  arrivedAt: ts("arrived_at"),
  completedAt: ts("completed_at"),
  cancelledAt: ts("cancelled_at"),
  cancelReason: text("cancel_reason"),
  reminderSentAt: ts("reminder_sent_at"),
  reviewRequestedAt: ts("review_requested_at"),
  // Резултат от известията при създаване (push/telegram/email) — видимост „защо не ме извести".
  notifyLog: jsonb("notify_log"),
  // Промоция (№11, drizzle/manual/0004_campaigns.sql; пише ги записването, част 3). FK е на ниво БД.
  campaignId: text("campaign_id"),
  regularPriceEur: real("regular_price_eur"), // редовната цена в момента на записа, при промоция
  cameFrom: text("came_from"), // откъде е дошъл клиентът: начална, промоции, категория, услуга, facebook…
  createdBy: text("created_by"),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
});

// Промоциите на специалистите (№11, решения 23, 24, 31; drizzle/manual/0004_campaigns.sql).
// status пази само решението; «предстои», «тече», «свършила», «изтекла» се смятат по датите
// (src/lib/campaigns/rules.ts, campaignPhase). Нищо в кода не трие промоция (доказателство).
export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey(),
  resourceId: text("resource_id").notNull(), // FK RESTRICT на ниво БД
  kind: text("kind").notNull().$type<"discount" | "gift">(),
  gift: text("gift"),
  reason: text("reason"),
  startsOn: date("starts_on", { mode: "string" }).notNull(),
  endsOn: date("ends_on", { mode: "string" }).notNull(),
  slots: integer("slots"),
  firstVisitOnly: boolean("first_visit_only").notNull().default(false),
  status: text("status").notNull().default("pending").$type<"pending" | "returned" | "approved" | "stopped">(),
  submittedAt: ts("submitted_at"),
  returnReason: text("return_reason").$type<"price" | "text" | "dates" | "other" | null>(),
  returnNote: text("return_note"),
  returnedAt: ts("returned_at"),
  approvedBy: text("approved_by"),
  approvedAt: ts("approved_at"),
  stopReason: text("stop_reason"),
  stopNote: text("stop_note"),
  stoppedAt: ts("stopped_at"),
  stoppedBy: text("stopped_by"),
  facebookPostId: text("facebook_post_id"),
  facebookPostedAt: ts("facebook_posted_at"),
  facebookDeletedAt: ts("facebook_deleted_at"),
  // Известията и опитите на крона (част 4): ключ → кога; всеки ключ веднъж.
  notified: jsonb("notified").notNull().default({}).$type<Record<string, string>>(),
  createdBy: text("created_by"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

// Седмичният карусел във Facebook (№11, част 4): един на понеделник.
export const campaignCarousels = pgTable("campaign_carousels", {
  id: text("id").primaryKey(),
  weekOf: date("week_of", { mode: "string" }).notNull().unique(),
  campaignIds: text("campaign_ids").array().notNull(),
  status: text("status").notNull().default("posting").$type<"posting" | "posted" | "failed" | "deleted" | "delete_failed">(),
  facebookPostId: text("facebook_post_id"),
  createdAt: ts("created_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});
export const campaignServices = pgTable(
  "campaign_services",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id").notNull(), // FK CASCADE на ниво БД
    serviceItemId: text("service_item_id").notNull(),
    prevPriceEur: real("prev_price_eur"), // най-ниската за 30 дни (price_log)
    newPriceEur: real("new_price_eur"), // null при подарък
    regularPriceEur: real("regular_price_eur"),
    priceFrom: boolean("price_from").notNull().default(false),
    prevPriceAt: ts("prev_price_at"),
  },
  (t) => [unique().on(t.campaignId, t.serviceItemId)],
);

// Лична бележка на изпълнител за клиент (формула, предпочитания). НЕ се споделя
// между работниците - наемателите имат собствена клиентела.
export const clientNotes = pgTable(
  "client_notes",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    note: text("note").notNull(),
    updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [unique().on(t.clientId, t.resourceId)],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    // FK + ON DELETE CASCADE: при триене на изпълнител абонаментите му се чистят сами
    // (иначе остават осиротели и sendPushToResource ги сканира безсмислено).
    resourceId: text("resource_id").references(() => resources.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  },
  // Index: sendPushToResource филтрира по resource_id при всеки push — без него е table scan.
  (t) => [index("push_subscriptions_resource_id_idx").on(t.resourceId)],
);

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
});

// Лог на бот въпросите (site bot, без LLM). Неотговорените (matched=false) са
// суров keyword research + кандидати за нови FAQ. Създава се от
// scripts/create-bot-queries-table.ts (db:push е счупен — виж памет).
export const botQueries = pgTable("bot_queries", {
  id: text("id").primaryKey(),
  message: text("message").notNull(),
  intent: text("intent").notNull(),
  matched: boolean("matched").notNull(),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
});

// Цел П3 (решение 7): натискания на «Обади се» и Viber. Само ден, страница, копче и брой: без IP и без
// идентификатор на човека (drizzle/manual/0005_goal_counters.sql; пише ги /api/call-click).
export const callClicks = pgTable(
  "call_clicks",
  {
    day: date("day", { mode: "string" }).notNull(),
    page: text("page").notNull(),
    kind: text("kind").notNull().$type<"tel" | "viber" | "tel-other" | "viber-other">(),
    spot: text("spot").notNull(),
    count: integer("count").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.day, t.page, t.kind, t.spot] })],
);

export type User = typeof user.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type ServiceItem = typeof serviceItems.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;
export type FaqItem = typeof faqItems.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type GalleryImage = typeof galleryImages.$inferSelect;
export type GoogleReview = typeof googleReviews.$inferSelect;
export type RentalPosition = typeof rentalPositions.$inferSelect;
export type RentalInquiry = typeof rentalInquiries.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type WorkingHour = typeof workingHours.$inferSelect;
export type ResourceService = typeof resourceServices.$inferSelect;
export type ResourceWorkingHour = typeof resourceWorkingHours.$inferSelect;
export type TimeOff = typeof timeOff.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignService = typeof campaignServices.$inferSelect;
export type ClientNote = typeof clientNotes.$inferSelect;
