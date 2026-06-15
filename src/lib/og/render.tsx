import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Споделен генератор за OG карти (1200×630). Всяка страница подава СВОЕ заглавие
 * → различна карта за всяка страница (не една генерична за целия сайт).
 *
 * Палитра = брандовата салвия от логото (globals.css --primary/--accent), НЕ
 * лилаво. Шрифт = Manrope с кирилица (зареден като bundled asset през
 * import.meta.url), за да рендира български текст коректно.
 */

const CREAM = "#F8F3EA"; // warm cream (--background)
const INK = "#211F26"; // soft ink (--foreground)
const SAGE = "#357A63"; // deep sage — signature от логото (--primary)
const MINT = "#A9E0CC"; // sage mint от логото (--accent)
const MUTED = "#6B6770";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Чете се веднъж на module init от файловата система. (Turbopack import.meta.url +
// fetch дава relative path без origin → гърми при prerender; fs работи и при build,
// и при runtime — виж next.config outputFileTracingIncludes.) Регистрираме latin И
// cyrillic subset за всеки weight (static, не variable — satori не чете variable
// ttf); satori прави glyph-level fallback, така че и латиница, и кирилица излизат
// с Manrope.
const ogDir = join(process.cwd(), "src/lib/og");
const OG_FONTS = [
  { name: "Manrope", data: readFileSync(join(ogDir, "Manrope-latin-400.woff")), weight: 400 as const, style: "normal" as const },
  { name: "Manrope", data: readFileSync(join(ogDir, "Manrope-latin-700.woff")), weight: 700 as const, style: "normal" as const },
  { name: "Manrope", data: readFileSync(join(ogDir, "Manrope-400.woff")), weight: 400 as const, style: "normal" as const },
  { name: "Manrope", data: readFileSync(join(ogDir, "Manrope-700.woff")), weight: 700 as const, style: "normal" as const },
];

export interface OgParams {
  /** Малък надпис горе (категорията/типа страница), напр. „УСЛУГИ", „ЖУРНАЛ". */
  eyebrow?: string;
  /** Главно заглавие (кирилица). */
  title: string;
  /** Подзаглавие/кратко описание. */
  subtitle?: string;
}

function titleSize(t: string): number {
  if (t.length <= 22) return 86;
  if (t.length <= 40) return 66;
  return 52;
}

function clamp(s: string | undefined, max: number): string | undefined {
  if (!s) return s;
  const t = s.trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

export async function renderOg({ eyebrow, title, subtitle }: OgParams): Promise<ImageResponse> {
  const sub = clamp(subtitle, 130);
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: CREAM,
          padding: "72px 80px",
          fontFamily: "Manrope",
          position: "relative",
        }}
      >
        {/* мек mint акцент — салвия, не виолет */}
        <div
          style={{
            position: "absolute",
            top: -130,
            right: -130,
            width: 380,
            height: 380,
            borderRadius: 380,
            backgroundColor: MINT,
            opacity: 0.5,
          }}
        />

        <div style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: 4, color: SAGE, textTransform: "uppercase" }}>
          {eyebrow ?? "Euphoria · Варна"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
          <div style={{ display: "flex", fontSize: titleSize(title), fontWeight: 700, color: INK, lineHeight: 1.05 }}>
            {title}
          </div>
          {sub && (
            <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: "#4A464F", marginTop: 22, lineHeight: 1.32 }}>
              {sub}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 26, color: MUTED }}>Euphoria Hair &amp; Beauty Bar · кв. Левски, Варна</div>
          <div style={{ display: "flex", backgroundColor: INK, color: CREAM, borderRadius: 999, padding: "14px 30px", fontSize: 24, fontWeight: 600 }}>
            euphoriabeauty.eu
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: OG_FONTS,
    },
  );
}
