import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Картината на промоцията за Facebook (№11, част 4; кадър визия-11/кръг-2/пост-фейсбук-1080x1350.png).
 * Сглобява се от кода, не се генерира: «при кого» в курсив, името на услугата, пунктир до «до …», логото и
 * «кв. Левски, Варна». Цена в картината няма (тя е в текста на поста, Саиф 7).
 * Курсивът е без българските ръкописни форми (думата на Канопус): satori не включва locl, затова буквите
 * излизат прави. Шрифтовете са статични woff през fs (паметта og-images), всяко подмножество с отделно име.
 * Размерите: 1080×1350 (пост, 4:5) и 1080×1080 (карта в карусела, Meta я реже квадратна).
 */

const PAPER = "#fdf9ef";
const INK = "#1c1b1f";
const SAGE = "#24694c";

const ogDir = join(process.cwd(), "src/lib/og");
const font = (file: string) => readFileSync(join(ogDir, file));
const FONTS = [
  { name: "CormorantCyr", data: font("Cormorant-cyrillic-400.woff"), weight: 400 as const, style: "normal" as const },
  { name: "CormorantLat", data: font("Cormorant-latin-400.woff"), weight: 400 as const, style: "normal" as const },
  { name: "CormorantItalicCyr", data: font("Cormorant-cyrillic-400-italic.woff"), weight: 400 as const, style: "normal" as const },
  { name: "CormorantItalicLat", data: font("Cormorant-latin-400-italic.woff"), weight: 400 as const, style: "normal" as const },
];
const UPRIGHT = "CormorantCyr, CormorantLat";
const ITALIC = "CormorantItalicCyr, CormorantItalicLat";
const LOGO = `data:image/png;base64,${font("og-logo.png").toString("base64")}`;

export const PROMO_POST_SIZE = { width: 1080, height: 1350 };
export const PROMO_CARD_SIZE = { width: 1080, height: 1080 };

export interface PromoImageParams {
  /** «при специалиста по маникюр» / «при Снежана». */
  who: string;
  /** Редовете на заглавието (името на услугата, вече срязано по дума). */
  titleLines: string[];
  /** «до 15 декември». */
  until: string;
  square?: boolean;
}

function titleSize(lines: string[]): number {
  const longest = Math.max(...lines.map((l) => l.length));
  if (longest <= 18) return 118;
  if (longest <= 26) return 92;
  return 74;
}

export function renderPromoImage({ who, titleLines, until, square }: PromoImageParams): ImageResponse {
  const size = square ? PROMO_CARD_SIZE : PROMO_POST_SIZE;
  const fs = titleSize(titleLines);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: PAPER,
          padding: square ? "0 98px 70px" : "0 98px 70px",
          color: INK,
        }}
      >
        {/* Блокът е по средата (кадър: 513–817 от 1350). */}
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", paddingTop: square ? 60 : 150 }}>
          <div style={{ display: "flex", fontFamily: ITALIC, fontSize: 62, lineHeight: 1.1, color: SAGE }}>{who}</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 14, fontFamily: UPRIGHT, fontSize: fs, lineHeight: 1.02 }}>
            {titleLines.map((l) => (
              <div key={l} style={{ display: "flex" }}>
                {l}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 26 }}>
            <div style={{ display: "flex", flexGrow: 1, height: 14, borderBottom: `3px dotted ${INK}`, opacity: 0.45, marginRight: 26, marginBottom: 14 }} />
            <div style={{ display: "flex", fontFamily: ITALIC, fontSize: 62, lineHeight: 1.1 }}>{until}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} width={square ? 220 : 257} height={square ? 189 : 221} alt="" />
          <div style={{ display: "flex", fontFamily: ITALIC, fontSize: 46, lineHeight: 1, marginBottom: 34 }}>кв. Левски, Варна</div>
        </div>
      </div>
    ),
    { ...size, fonts: FONTS },
  );
}
