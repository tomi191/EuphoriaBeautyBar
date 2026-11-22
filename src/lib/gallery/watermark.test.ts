import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { applyWatermark, watermarkPlacement } from "./watermark";

const flat = (w: number, h: number, c: { r: number; g: number; b: number }) =>
  sharp({ create: { width: w, height: h, channels: 3, background: c } }).jpeg().toBuffer();

/** Пъстър шум (като листа или дънки): голямо разсейване на яркостта. */
async function noisy(w: number, h: number) {
  const px = Buffer.alloc(w * h * 3);
  for (let i = 0; i < px.length; i += 3) {
    const v = (i / 3) % 2 === 0 ? 20 : 235;
    px[i] = v; px[i + 1] = v; px[i + 2] = v;
  }
  return sharp(px, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
}

describe("водният знак (решение А на Канопус)", () => {
  it("числата на мястото: 24% от средната рамка 4:5, отстояние 4%, най-малко 140 px", () => {
    expect(watermarkPlacement(1200, 1600)).toMatchObject({ S: 1200, mw: 288, m: 48 });
    expect(watermarkPlacement(1600, 1200)).toMatchObject({ S: 960, mw: 230 });
    expect(watermarkPlacement(720, 1600)).toMatchObject({ S: 720, mw: 173 });
    expect(watermarkPlacement(500, 700)).toMatchObject({ S: 500, mw: 140 });
  });

  it("светъл спокоен фон: знак в мастило; тъмен: кремав; долу, в рамката 4:5", async () => {
    const light = await applyWatermark(await flat(1200, 1600, { r: 240, g: 235, b: 228 }));
    expect(light.info).toMatchObject({ tone: "dark", busy: false, markW: 288, markH: 93, top: 1409, corner: "br", left: 864 });
    const dark = await applyWatermark(await flat(1200, 1600, { r: 25, g: 22, b: 27 }));
    expect(dark.info).toMatchObject({ tone: "light", busy: false });
    expect((await sharp(light.buffer).metadata()).format).toBe("webp");
  });

  it("знакът е върху самата снимка: пикселите под него са сменени, другаде не", async () => {
    const input = await flat(1200, 1600, { r: 25, g: 22, b: 27 });
    const { buffer, info } = await applyWatermark(input);
    const px = async (b: Buffer, left: number, top: number) =>
      (await sharp(b).extract({ left, top, width: info!.markW, height: info!.markH }).raw().toBuffer()).reduce((a, v) => a + v, 0);
    expect(await px(buffer, info!.left, info!.top)).toBeGreaterThan((await px(input, info!.left, info!.top)) * 1.5);
    expect(Math.abs((await px(buffer, 100, 100)) - (await px(input, 100, 100)))).toBeLessThan(info!.markW * info!.markH * 3 * 3);
  });

  it("пъстър фон: кремав знак с ореол", async () => {
    const { info } = await applyWatermark(await noisy(900, 1200));
    expect(info).toMatchObject({ busy: true, tone: "light" });
  });

  it("по-спокойният ъгъл: цветна работа долу вдясно → знакът отива вляво", async () => {
    const base = sharp({ create: { width: 1200, height: 1600, channels: 3, background: { r: 230, g: 228, b: 225 } } });
    const busyColour = await noisy(400, 200);
    const input = await base.composite([{ input: busyColour, left: 800, top: 1380 }]).png().toBuffer();
    const { info } = await applyWatermark(input);
    expect(info?.corner).toBe("bl");
  });

  it("снимка с къса страна под 480 px не получава знак", async () => {
    const r = await applyWatermark(await flat(470, 800, { r: 120, g: 120, b: 120 }));
    expect(r).toMatchObject({ skipped: true, info: null });
  });
});
