import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { FeaturedServices } from "@/components/sections/featured-services";
import { BrandsMarquee } from "@/components/sections/brands-marquee";
import { ReviewsSplit } from "@/components/sections/reviews-split";
import { GiftCardBanner } from "@/components/sections/gift-card-banner";
import { FeaturedBlog } from "@/components/sections/featured-blog";
import { FeaturedGallery } from "@/components/sections/featured-gallery";
import { BrandStory } from "@/components/sections/brand-story";
import { CtaBooking } from "@/components/sections/cta-booking";
import { FaqContactSection } from "@/components/sections/faq-contact-section";
import { LocationMap } from "@/components/sections/location-map";
import { InstagramSection } from "@/components/sections/instagram-section";
import { LineDivider } from "@/components/brand/line-divider";
import { JsonLd } from "@/components/seo/json-ld";
import { faqSchema, localBusinessSchema } from "@/lib/schema";
import { getFaqItems } from "@/lib/data/faq-db";
import { HOME_FAQ_COUNT } from "@/lib/data/faq";
import { db } from "@/lib/db";

// Canonical за началната (root layout вече не слага глобален).
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const [googleReviews, summaryRow, faq] = await Promise.all([
    db.query.googleReviews.findMany({ columns: { rating: true } }),
    db.query.siteSettings.findFirst({ where: (s, { eq }) => eq(s.key, "google_reviews_summary") }),
    getFaqItems(),
  ]);
  // Реалните брой/рейтинг са от целия Google профил (вкл. отзивите само със
  // звезди) — иначе Hero + AggregateRating показват 5,0/24 вместо реалните 4,8/43.
  const summary = summaryRow?.value as { rating: number; total: number } | undefined;
  const rating = summary?.rating
    ? { value: summary.rating, count: summary.total }
    : googleReviews.length > 0
      ? {
          value: googleReviews.reduce((s, r) => s + r.rating, 0) / googleReviews.length,
          count: googleReviews.length,
        }
      : null;

  return (
    <>
      <div id="hero">
        <Hero rating={rating} />
      </div>
      <FeaturedServices />
      <BrandsMarquee />
      <FeaturedGallery />
      <LineDivider />
      <BrandStory />
      <ReviewsSplit />
      <GiftCardBanner />
      <div id="blog">
        <FeaturedBlog />
      </div>
      <LineDivider />
      <FaqContactSection items={faq} />
      <LocationMap />
      <InstagramSection />
      <div id="contact">
        <CtaBooking />
      </div>
      {/* LocalBusiness с AggregateRating (звезди в SERP) + FAQPage (видимите Q&A 1:1) */}
      <JsonLd data={[localBusinessSchema(rating ?? undefined), faqSchema(faq.slice(0, HOME_FAQ_COUNT))]} />
    </>
  );
}
