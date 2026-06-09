import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { getServiceCatalog } from "@/lib/data/service-catalog";
import { blogPosts } from "@/lib/data/blog";
import { montibelloProducts } from "@/lib/data/montibello";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();
  const serviceCategories = await getServiceCatalog();

  const staticPaths = [
    "",
    "/uslugi",
    "/galeriya",
    "/montibello",
    "/za-nas",
    "/contacts",
    "/karieri",
    "/blog",
  ];

  return [
    ...staticPaths.map((path) => ({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1.0 : 0.8,
    })),
    ...serviceCategories.map((c) => ({
      url: `${base}/uslugi/${c.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...montibelloProducts.map((p) => ({
      url: `${base}/montibello/${p.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...blogPosts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
