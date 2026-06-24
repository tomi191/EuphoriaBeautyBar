import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [["remark-gfm"]],
    rehypePlugins: [],
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  reactCompiler: true,
  // OG генераторът чете Manrope.ttf през fs → трасирай го в serverless bundle-а,
  // иначе dynamic OG routes (напр. blog/[slug]) гърмят на runtime с ENOENT.
  outputFileTracingIncludes: {
    "/**": ["./src/lib/og/*.woff"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "euphoriabeauty.eu",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Cover изображения от Supabase Storage (AI генерирани блог корици)
        protocol: "https",
        hostname: "rljuzmvaytfptcjpwquu.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Канонично име на sitemap-индекса е /sitemap-index.xml. /sitemap.xml пази
      // обратна съвместимост (стари bookmarks/crawlers) → 308 към canonical.
      // Redirect-ът ЖИВЕЕ тук (не в route handler): static prerender на route,
      // връщащ 308, drop-ва Location header-а и сервира празно 200 (vrachka урок).
      { source: "/sitemap.xml", destination: "/sitemap-index.xml", permanent: true },

      // ─── WordPress → Next.js миграция: 301 на изоставените стари URL ───
      // 55× 404 + 141× 3xx в Ahrefs краула удрят в стари WP адреси, които още
      // носят backlinks (2.2K линка / 45 домейна). 301 → връща link equity-то към
      // релевантни живи страници вместо да го хвърля в 404. Стари blog таксономии
      // (category/tag/author/feed) нямат еквивалент → пращат към /blog хъба.
      { source: "/category/:path*", destination: "/blog", permanent: true },
      { source: "/tag/:path*", destination: "/blog", permanent: true },
      { source: "/author/:path*", destination: "/blog", permanent: true },
      // Стари WP blog permalinks по рубрика (нямат 1:1 нов slug) → /blog хъб.
      // :path* хваща и /<rubrika>/<slug> и /<rubrika>/<slug>/feed (WP RSS).
      { source: "/hair-care/:path*", destination: "/blog", permanent: true },
      { source: "/health-and-wellness/:path*", destination: "/blog", permanent: true },
      { source: "/makeup-and-cosmetics/:path*", destination: "/blog", permanent: true },
      // Стари Montibello продуктови URL (/montibello-hop-ultra-*) → каталог хъба.
      { source: "/montibello-hop-:slug(.*)", destination: "/montibello", permanent: true },
      // Стар URL на услуга (преди /uslugi/ префикса) → новата категория.
      { source: "/frizorski-terapii", destination: "/uslugi/frizorski-terapii", permanent: true },
    ];
  },
};

export default withMDX(nextConfig);
