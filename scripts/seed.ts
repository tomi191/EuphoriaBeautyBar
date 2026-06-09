/* eslint-disable no-console */
import "dotenv/config";
import { nanoid } from "nanoid";
import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";
import * as schema from "../src/lib/db/schema";
import { team as teamSeed } from "../src/lib/data/team";
import { serviceCategories as servicesSeed } from "../src/lib/data/services";
import { testimonials as testimonialsSeed } from "../src/lib/data/testimonials";
import { faqItems as faqSeed } from "../src/lib/data/faq";
import { blogPosts as blogSeed } from "../src/lib/data/blog";
import { galleryImages as gallerySeed } from "../src/lib/data/gallery";

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@euphoriabeauty.eu";
  const password = process.env.ADMIN_PASSWORD ?? "Promenime2026!";
  const name = process.env.ADMIN_NAME ?? "Snezhana";

  const existing = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, email) });
  if (existing) {
    console.log(`✓ Admin вече съществува: ${email}`);
    return;
  }

  await auth.api.signUpEmail({
    body: { email, password, name },
  });
  console.log(`✓ Създаден admin: ${email}  (парола: ${password})`);
}

async function seedTeam() {
  await db.delete(schema.teamMembers);
  for (const [i, m] of teamSeed.entries()) {
    await db.insert(schema.teamMembers).values({
      id: nanoid(),
      slug: m.slug,
      name: m.name,
      role: m.role,
      bio: m.bio,
      image: m.image,
      experience: m.experience,
      specialties: [...m.specialties],
      sortOrder: i,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`✓ Team: ${teamSeed.length} записа`);
}

async function seedServices() {
  await db.delete(schema.serviceItems);
  await db.delete(schema.serviceCategories);
  for (const [ci, c] of servicesSeed.entries()) {
    const catId = nanoid();
    await db.insert(schema.serviceCategories).values({
      id: catId,
      slug: c.slug,
      title: c.title,
      shortTitle: c.shortTitle,
      tagline: c.tagline,
      description: c.description,
      longDescription: c.longDescription,
      icon: c.icon,
      heroImage: c.heroImage,
      sortOrder: ci,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    let order = 0;
    for (const group of c.groups) {
      for (const item of group.items) {
        await db.insert(schema.serviceItems).values({
          id: nanoid(),
          categoryId: catId,
          groupTitle: group.title,
          name: item.name,
          price: item.price,
          priceMax: item.priceMax,
          priceFrom: item.priceFrom ?? false,
          currency: item.currency,
          duration: item.duration,
          description: item.description,
          sortOrder: order++,
        });
      }
    }
  }
  console.log(`✓ Services: ${servicesSeed.length} категории`);
}

async function seedTestimonials() {
  await db.delete(schema.testimonials);
  for (const [i, t] of testimonialsSeed.entries()) {
    await db.insert(schema.testimonials).values({
      id: nanoid(),
      name: t.name,
      service: t.service,
      rating: t.rating,
      quote: t.quote,
      initials: t.initials,
      source: "manual",
      approved: true,
      sortOrder: i,
      createdAt: new Date(),
    });
  }
  console.log(`✓ Testimonials: ${testimonialsSeed.length} записа`);
}

async function seedFaq() {
  await db.delete(schema.faqItems);
  for (const [i, f] of faqSeed.entries()) {
    await db.insert(schema.faqItems).values({
      id: nanoid(),
      question: f.question,
      answer: f.answer,
      sortOrder: i,
      active: true,
    });
  }
  console.log(`✓ FAQ: ${faqSeed.length} записа`);
}

async function seedBlog() {
  await db.delete(schema.blogPosts);
  for (const p of blogSeed) {
    await db.insert(schema.blogPosts).values({
      id: nanoid(),
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      cover: p.cover ?? null,
      contentJson: p.content,
      publishedAt: new Date(p.date),
      readingMinutes: p.readingMinutes,
      status: "published",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`✓ Blog: ${blogSeed.length} статии`);
}

async function seedGallery() {
  await db.delete(schema.galleryImages);
  for (const [i, img] of gallerySeed.entries()) {
    await db.insert(schema.galleryImages).values({
      id: img.id,
      src: img.src,
      alt: img.alt,
      category: img.category,
      width: img.width,
      height: img.height,
      sortOrder: i,
    });
  }
  console.log(`✓ Gallery: ${gallerySeed.length} изображения`);
}

async function main() {
  console.log("⚙ Стартиране на seed...\n");
  await ensureAdmin();
  await seedTeam();
  await seedServices();
  await seedTestimonials();
  await seedFaq();
  await seedBlog();
  await seedGallery();
  console.log("\n✅ Seed готов!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed грешка:", err);
  process.exit(1);
});
