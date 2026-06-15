import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/staff/"] },
      // Спец. UA група ЗАМЕСТВА "*" правилата → disallow трябва да се повтори и тук.
      { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "anthropic-ai"], allow: "/", disallow: ["/api/", "/admin/", "/staff/"] },
    ],
    sitemap: `${siteConfig.url}/sitemap-index.xml`,
    host: siteConfig.url,
  };
}
