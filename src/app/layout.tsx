import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Cormorant_Garamond } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileCallBar } from "@/components/layout/mobile-call-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { localBusinessSchema, websiteSchema, organizationSchema, personSchema } from "@/lib/schema";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  variable: "--font-cormorant",
  // Cormorant е само акцент-италик (font-serif italic + .handwritten) —
  // сайтът реално ползва единствено 400 normal/italic. 8 преload-нати
  // woff2 файла (226KB) се бореха с hero снимката за LCP.
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    // Кратък default (~55 зн.) — дългият се режеше в Google на ~60.
    default: "Euphoria — салон за красота в кв. Левски, Варна",
    template: `%s · ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  // canonical НЕ се слага тук — наследява се от всички страници и ги обявява
  // за дубликати на началната. Всяка страница декларира своя в metadata.
  keywords: [
    "фризьорски салон Варна",
    "балаяж Варна",
    "кератинова терапия",
    "маникюр Варна",
    "педикюр Варна",
    "козметика Варна",
    "Montibello",
    "Goldwell Kerasilk",
    "Hydra Facial",
    "микронидлинг",
    "сватбена прическа",
  ],
  authors: [{ name: siteConfig.founder }],
  creator: siteConfig.name,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/images/brand/favicon-32.webp", sizes: "32x32", type: "image/webp" },
      { url: "/images/brand/favicon-180.webp", sizes: "180x180", type: "image/webp" },
      { url: "/images/brand/favicon-192.webp", sizes: "192x192", type: "image/webp" },
      { url: "/images/brand/favicon-270.webp", sizes: "270x270", type: "image/webp" },
    ],
    apple: "/images/brand/favicon-180.webp",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0F" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" suppressHydrationWarning className={cn(inter.variable, manrope.variable, cormorant.variable)}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <div className="relative flex min-h-screen flex-col pb-14 lg:pb-0">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <MobileCallBar />
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
        <JsonLd data={[localBusinessSchema, websiteSchema, organizationSchema, personSchema]} />
      </body>
    </html>
  );
}
