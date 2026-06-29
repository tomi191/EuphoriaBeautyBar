import type { Metadata, Viewport } from "next";
import { SwRegister } from "@/components/staff/sw-register";

// Manifest-ът се закача САМО на /staff страниците → инсталира се само
// работническото приложение (scope /staff), не целият сайт.
export const metadata: Metadata = {
  title: "Euphoria — Екип",
  manifest: "/staff.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Euphoria Екип",
  },
  // iOS Safari игнорира webp за apple-touch-icon → дай PNG (вече има 192px).
  icons: { apple: "/icons/pwa-192.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#2b2b2b",
  width: "device-width",
  initialScale: 1,
  // Не блокираме zoom (WCAG 1.4.4) — слабовиждащите трябва да могат да увеличават.
  // Случайният zoom при фокус се избягва с 16px инпути, не със забрана.
  viewportFit: "cover",
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* SW на всички staff страници (вкл. login) — нужен за install prompt. */}
      <SwRegister />
      {children}
    </>
  );
}
