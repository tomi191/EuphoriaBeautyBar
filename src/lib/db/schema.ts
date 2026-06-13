import { pgTable, text, integer, real, boolean, timestamp, jsonb, unique, index } from "drizzle-orm/pg-core";

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

export const rentalPositions = pgTable("rental_positions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  skills: jsonb("skills").notNull().$type<string[]>(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
});

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
  currency: text("currency").notNull().default("лв"),
  durationMin: integer("duration_min").notNull().default(30),
  bufferMin: integer("buffer_min").notNull().default(10),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
});

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
  createdBy: text("created_by"),
  createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
});

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
export type Resource = typeof resources.$inferSelect;
export type WorkingHour = typeof workingHours.$inferSelect;
export type ResourceService = typeof resourceServices.$inferSelect;
export type ResourceWorkingHour = typeof resourceWorkingHours.$inferSelect;
export type TimeOff = typeof timeOff.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type ClientNote = typeof clientNotes.$inferSelect;
