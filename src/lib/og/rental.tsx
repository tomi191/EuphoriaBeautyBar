import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { siteConfig } from "@/lib/site";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";

/**
 * Картата за споделяне на обявите за място под наем (кадър `посока-Б-fb.png`, визия №12):
 * логото горе вляво, заглавието, курсивът в основния цвят, «кв. Левски, Варна», а вдясно
 * снимката в извитата рамка с линията от логото. 1200×630.
 *
 * Капаните от паметта (og-images): шрифтовете са статични woff, четат се с fs (не с
 * import.meta.url), регистрират се latin и cyrillic под едно име. Снимката се реже с sharp
 * (satori не реже по крива), а webp от хранилището също минава през sharp.
 */

const CREAM = "#fbf6f0"; // --background
const INK = "#111116"; // --foreground
const SAGE = "#24694c"; // --primary
const MUTED = "#55545f"; // --muted-foreground

export { OG_CONTENT_TYPE, OG_SIZE };

const ogDir = join(process.cwd(), "src/lib/og");
const font = (file: string) => readFileSync(join(ogDir, file));
// Всяко подмножество е с отделно име, а стилът изброява и двете: при едно и също име satori губи
// кирилицата и я взима от друг шрифт (видяно на 22.11.2026).
const FONTS = [
  { name: "ManropeCyr", data: font("Manrope-500.woff"), weight: 500 as const, style: "normal" as const },
  { name: "ManropeLat", data: font("Manrope-latin-500.woff"), weight: 500 as const, style: "normal" as const },
  { name: "CormorantItalicCyr", data: font("Cormorant-cyrillic-400-italic.woff"), weight: 400 as const, style: "normal" as const },
  { name: "CormorantItalicLat", data: font("Cormorant-latin-400-italic.woff"), weight: 400 as const, style: "normal" as const },
];
const MANROPE = "ManropeCyr, ManropeLat";
const ITALIC = "CormorantItalicCyr, CormorantItalicLat";
const LOGO = `data:image/png;base64,${font("og-logo.png").toString("base64")}`;

// Снимката: кутия 560×570 от (620, 60) до долния ръб. Арката е в координатите на кутията.
const PHOTO = { x: 620, y: 60, w: 560, h: 570 };
const ARCH = "M0 570 L0 300 C0 138 122 0 300 0 L468 0 Q560 0 560 92 L560 570 Z";
// Линиите в координатите на картата: рамката около снимката и линията от логото към нея.
const LINES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none" stroke="${SAGE}" stroke-opacity="0.6" stroke-width="2">
<path d="M609 630 L609 360 C609 186 735 49 920 49 L1088 49 Q1191 49 1191 152 L1191 630"/>
<path d="M176 133 L612 133 C668 133 690 112 716 86"/>
</svg>`;
const LINES = `data:image/svg+xml;base64,${Buffer.from(LINES_SVG).toString("base64")}`;

const publicDir = resolve(process.cwd(), "public");

async function loadPhoto(src: string): Promise<Buffer | null> {
  try {
    let url = src;
    if (src.startsWith("/")) {
      const file = resolve(publicDir, `.${src}`);
      if (file.startsWith(publicDir + sep)) {
        try {
          return await readFile(file);
        } catch {
          // На Vercel public/ не е във функцията: четем същия файл от сайта.
        }
      }
      url = new URL(src, siteConfig.url).toString();
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error("[og/rental] снимката не се зареди, картата е без нея:", src, e);
    return null;
  }
}

async function archPhoto(src: string | null): Promise<string | null> {
  if (!src) return null;
  const buf = await loadPhoto(src);
  if (!buf) return null;
  try {
    const mask = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${PHOTO.w}" height="${PHOTO.h}"><path d="${ARCH}" fill="#fff"/></svg>`,
    );
    // Две минавания: sharp прави flatten преди composite, затова маската е отделно.
    const masked = await sharp(buf)
      .resize(PHOTO.w, PHOTO.h, { fit: "cover" })
      .ensureAlpha()
      .composite([{ input: mask, blend: "dest-in" }])
      .png()
      .toBuffer();
    const out = await sharp(masked).flatten({ background: CREAM }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch (e) {
    console.error("[og/rental] снимката не се обработи, картата е без нея:", src, e);
    return null;
  }
}

export interface RentalOgParams {
  /** «Място под наем за маникюрист» или «Места под наем». */
  title: string;
  /** Курсивът под заглавието; масив = всеки елемент на свой ред (иначе пренасянето реже, където падне). */
  subtitle: string | readonly string[];
  /** Снимката (път от public/ или адрес от хранилището). */
  image: string | null;
}

export async function renderRentalOg({ title, subtitle, image }: RentalOgParams): Promise<ImageResponse> {
  const photo = await archPhoto(image);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", backgroundColor: CREAM }}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} width={PHOTO.w} height={PHOTO.h} style={{ position: "absolute", left: PHOTO.x, top: PHOTO.y }} alt="" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LINES} width={1200} height={630} style={{ position: "absolute", left: 0, top: 0 }} alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO} width={150} height={129} style={{ position: "absolute", left: 28, top: 22 }} alt="" />
        <div style={{ position: "absolute", left: 32, top: 172, width: 590, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: MANROPE, fontWeight: 500, fontSize: 84, lineHeight: 0.9, letterSpacing: -2, color: INK }}>
            {title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 20, fontFamily: ITALIC, fontSize: 50, lineHeight: 1.1, color: SAGE }}>
            {(typeof subtitle === "string" ? [subtitle] : subtitle).map((line) => (
              <div key={line} style={{ display: "flex" }}>
                {line}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: 24, fontFamily: MANROPE, fontWeight: 500, fontSize: 24, letterSpacing: 1.5, color: MUTED }}>
            кв. Левски, Варна
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: FONTS },
  );
}
