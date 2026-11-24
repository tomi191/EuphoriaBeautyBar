import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { processTeamPhoto } from "@/lib/images/team-photo";
import { looksLikeHeic, TEAM_PHOTO_ERRORS } from "@/lib/images/team-photo-rules";

async function jpegWithGps(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: { r: 140, g: 180, b: 160 } } })
    .jpeg()
    .withExif({ IFD0: { Make: "ProbaPhone" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "43/1 12/1 0/1" } })
    .toBuffer();
}

describe("processTeamPhoto", () => {
  it("снимка с данни за място → WebP без метаданни, смалена до 600×750", async () => {
    const input = await jpegWithGps(2000, 3000);
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const res = await processTeamPhoto(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const meta = await sharp(res.webp).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(meta.width).toBe(500);
    expect(meta.height).toBe(750);
  });

  it("малка снимка не се уголемява", async () => {
    const res = await processTeamPhoto(await jpegWithGps(240, 300));
    expect(res.ok && (await sharp(res.webp).metadata()).width).toBe(240);
  });

  it("HEIC по байтовете → ясно съобщение", async () => {
    const heic = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic"), Buffer.alloc(32)]);
    expect(looksLikeHeic(heic)).toBe(true);
    expect(await processTeamPhoto(heic)).toEqual({ ok: false, error: TEAM_PHOTO_ERRORS.heic });
  });

  it("файл, който не е снимка (SVG с име .jpg) → отказ по байтовете", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(await processTeamPhoto(svg)).toEqual({ ok: false, error: TEAM_PHOTO_ERRORS.type });
  });

  it("над 5 MB → отказ", async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 0xff);
    expect(await processTeamPhoto(big)).toEqual({ ok: false, error: TEAM_PHOTO_ERRORS.tooBig });
  });

  it("счупен JPG (верни първи байтове) → не се отваря", async () => {
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)]);
    expect(await processTeamPhoto(broken)).toEqual({ ok: false, error: TEAM_PHOTO_ERRORS.notReadable });
  });
});
