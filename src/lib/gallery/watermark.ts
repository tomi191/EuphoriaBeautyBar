import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Водният знак на салона (решение А «Подпис» на Канопус, доклад 2026-11-22-design-воден-знак-и-описание;
 * логиката е пренесена от неговия 2-watermark.mjs без промяна в числата).
 * - Знакът е надписът от логото «euphoria / hair & beauty bar» (файловете в ./marks, трасирани в next.config).
 * - S = ширината на средната рамка 4:5 = min(ширина, 0,8 × височина); знакът е 24% от S (най-малко 140 px),
 *   на 4% от S от ръбовете на рамката, с плътност 82%; плочките 4:5 на началната не го режат.
 * - Ъгълът: долният с по-малко детайл (наситеност + разсейване на яркостта); при разлика под 0,03 печели десният.
 * - Цветът: средна яркост Y под знака; спокоен фон (разсейване до 0,14): Y > 0,18 → мастило, иначе кремав.
 *   Пъстър фон: винаги кремав, с мек ореол в мастило (готов файл, 60%).
 * - Снимка с къса страна под 480 px не получава знак.
 */
export const WATERMARK = { width: 0.24, margin: 0.04, opacity: 0.82, minPx: 140 } as const;
export const Y_SWITCH = 0.18;
export const BUSY_STD = 0.14;
export const HALO_ALPHA = 0.6;
export const HALO_PAD = 0.04; // като в 1-prep-marks.py
export const MIN_PHOTO_SHORT = 480;

type Tone = "light" | "dark";
const MARKS_DIR = path.join(process.cwd(), "src/lib/gallery/marks");
const markCache = new Map<string, Promise<Buffer>>();
function mark(name: string) {
  if (!markCache.has(name)) markCache.set(name, fs.readFile(path.join(MARKS_DIR, `wordmark-${name}.png`)));
  return markCache.get(name)!;
}

const lin = (c: number) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const lum = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

export function watermarkPlacement(w: number, h: number) {
  const S = Math.min(w, Math.round(0.8 * h));
  const frameH = Math.min(h, Math.round(1.25 * S));
  const fx = Math.round((w - S) / 2);
  const fy = Math.round((h - frameH) / 2);
  const mw = Math.max(WATERMARK.minPx, Math.round(WATERMARK.width * S));
  const m = Math.round(WATERMARK.margin * S);
  return { S, fx, fy, frameH, mw, m };
}

export type WatermarkInfo = {
  w: number; h: number; markW: number; markH: number; left: number; top: number;
  meanY: number; stdY: number; tone: Tone; busy: boolean; corner: "bl" | "br";
};

/**
 * Слага знака върху снимката. Входът е вече завъртян и без метаданни (stripImageMetadata).
 * Връща новия файл (WebP по подразбиране) и мерките на наслагването; skipped = снимката е под 480 px.
 */
export async function applyWatermark(
  input: Buffer,
  opts: { format?: "webp" | "jpeg" } = {},
): Promise<{ buffer: Buffer; skipped: boolean; info: WatermarkInfo | null }> {
  const format = opts.format ?? "webp";
  const encode = (img: sharp.Sharp) =>
    format === "jpeg" ? img.jpeg({ quality: 88, mozjpeg: true }).toBuffer() : img.webp({ quality: 86 }).toBuffer();

  const { data: base, info: bi } = await sharp(input).rotate().toBuffer({ resolveWithObject: true });
  const w = bi.width, h = bi.height;
  if (Math.min(w, h) < MIN_PHOTO_SHORT) return { buffer: await encode(sharp(base)), skipped: true, info: null };

  const p = watermarkPlacement(w, h);
  const lightMeta = await sharp(await mark("light")).metadata();
  const mh = Math.round((lightMeta.height! / lightMeta.width!) * p.mw);
  const top = p.fy + p.frameH - p.m - mh;
  const xBR = p.fx + p.S - p.m - p.mw;
  const xBL = p.fx + p.m;

  const region = async (left: number) =>
    (await sharp(base).extract({ left, top, width: p.mw, height: mh }).removeAlpha().raw().toBuffer({ resolveWithObject: true })).data;

  // По-спокойният долен ъгъл: работата (нокти, боядисана коса) е цветна и с детайл, фонът е по-тих.
  const score = async (left: number) => {
    const d = await region(left);
    let c = 0, sy = 0, sy2 = 0, k = 0;
    for (let i = 0; i < d.length; i += 3) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      c += (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      const Y = lum(r, g, b);
      sy += Y; sy2 += Y * Y; k++;
    }
    const mean = sy / k;
    return c / k + Math.sqrt(Math.max(0, sy2 / k - mean * mean));
  };
  const br = +(await score(xBR)).toFixed(3);
  const bl = +(await score(xBL)).toFixed(3);
  const corner: "bl" | "br" = bl < br - 0.03 ? "bl" : "br";
  const left = corner === "br" ? xBR : xBL;

  // Яркостта под знака решава цвета.
  const d = await region(left);
  let sum = 0, sum2 = 0;
  const n = p.mw * mh;
  for (let i = 0; i < d.length; i += 3) {
    const Y = lum(d[i], d[i + 1], d[i + 2]);
    sum += Y; sum2 += Y * Y;
  }
  const meanY = sum / n;
  const stdY = Math.sqrt(Math.max(0, sum2 / n - meanY * meanY));
  const busy = stdY > BUSY_STD;
  const tone: Tone = !busy && meanY > Y_SWITCH ? "dark" : "light";

  const fade = (buf: Buffer, width: number, height: number, alpha: number) =>
    sharp(buf)
      .resize({ width, height, fit: "fill" })
      .ensureAlpha()
      .composite([{ input: { create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha } } }, blend: "dest-in" }])
      .png()
      .toBuffer();

  const layers: sharp.OverlayOptions[] = [];
  if (busy) {
    const pad = Math.round(p.mw * HALO_PAD);
    const opposite = tone === "light" ? "dark" : "light";
    const halo = await fade(await mark(`halo-${opposite}`), p.mw + 2 * pad, mh + 2 * pad, HALO_ALPHA);
    layers.push({ input: halo, left: left - pad, top: top - pad });
  }
  layers.push({ input: await fade(await mark(tone), p.mw, mh, WATERMARK.opacity), left, top });

  const buffer = await encode(sharp(base).composite(layers));
  return {
    buffer,
    skipped: false,
    info: { w, h, markW: p.mw, markH: mh, left, top, meanY: +meanY.toFixed(3), stdY: +stdY.toFixed(3), tone, busy, corner },
  };
}
