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
import { faqPageSchema, localBusinessSchema } from "@/lib/schema";
import { db } from "@/lib/db";

// Canonical за началната (root layout вече не слага глобален).
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const googleReviews = await db.query.googleReviews.findMany({ columns: { rating: true } });
  const rating =
    googleReviews.length > 0
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
      <FaqContactSection />
      <LocationMap />
      <InstagramSection />
      <div id="contact">
        <CtaBooking />
      </div>
      {/* LocalBusiness с AggregateRating (звезди в SERP) + FAQPage (видимите Q&A 1:1) */}
      <JsonLd data={[localBusinessSchema(rating ?? undefined), faqPageSchema]} />
    </>
  );
}
