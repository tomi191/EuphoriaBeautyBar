import sharp from "sharp";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Поверителност при качване: снимка с местоположение, пратена такава, каквато е (резервният път на
// prepareFile, когато браузърът не я пресъздаде), не стига до хранилището с метаданните си.
// Проверява се байтовете, които трите действия подават на хранилището.

const uploads = vi.hoisted(() => [] as { bucket: string; path: string; body: Buffer }[]);
const session = vi.hoisted(() => ({ user: { id: "u1", role: "admin" } }));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => session } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    storage: {
      createBucket: async () => ({}),
      from: (bucket: string) => ({
        upload: async (path: string, body: Buffer) => {
          uploads.push({ bucket, path, body: Buffer.from(body) });
          return { error: null };
        },
        remove: async () => ({}),
      }),
    },
  }),
}));
vi.mock("@/lib/db", async () => {
  const schema = await vi.importActual<typeof import("@/lib/db/schema")>("@/lib/db/schema");
  const chain = { set: () => chain, where: async () => [], values: async () => [] };
  return {
    schema,
    db: {
      query: {
        rentalPositions: { findFirst: async () => ({ id: "l1", slug: "myasto", image: null }) },
        resources: { findFirst: async () => ({ id: "r1", image: null }) },
      },
      update: () => chain,
      insert: () => chain,
      select: () => ({ from: async () => [{ min: 0 }] }),
    },
  };
});

import { uploadGalleryImage } from "@/lib/actions/gallery";
import { uploadListingImage } from "@/lib/actions/rental-listings";
import { uploadStaffPhoto } from "@/lib/actions/staff-photo";

const MAKE = "ProbaPhone-GPS";
let jpeg: Buffer;
let png: Buffer;

/** Тагът, който сочи към блока с местоположението (GPS IFD, 0x8825), в двата реда на байтовете. */
function hasGpsPointer(exif: Buffer | undefined) {
  if (!exif) return false;
  return exif.includes(Buffer.from([0x88, 0x25])) || exif.includes(Buffer.from([0x25, 0x88]));
}

async function expectClean(body: Buffer, format: "jpeg" | "png") {
  const meta = await sharp(body).metadata();
  expect(meta.format).toBe(format);
  expect(meta.exif).toBeUndefined();
  expect(meta.xmp).toBeUndefined();
  expect(body.includes(Buffer.from(MAKE))).toBe(false);
}

function form(body: Buffer, type: string, extra: Record<string, string> = {}) {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array(body)], "telefon.jpg", { type }));
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  return fd;
}

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://storage.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test";
  const exif = {
    IFD0: { Make: MAKE, Model: "SM-PROBA" },
    IFD3: { GPSLatitudeRef: "N", GPSLatitude: "43/1 12/1 3/1", GPSLongitudeRef: "E", GPSLongitude: "27/1 54/1 5/1" },
  };
  const base = sharp({ create: { width: 64, height: 48, channels: 3, background: "#c8b8a6" } });
  jpeg = await base.clone().jpeg().withExif(exif).toBuffer();
  png = await base.clone().png().withExif(exif).toBuffer();
});

beforeEach(() => {
  uploads.length = 0;
});

describe("качване на снимка: метаданните не стигат до хранилището", () => {
  it("пробният файл наистина носи местоположение и марка на телефона", async () => {
    const meta = await sharp(jpeg).metadata();
    expect(hasGpsPointer(meta.exif)).toBe(true);
    expect(jpeg.includes(Buffer.from(MAKE))).toBe(true);
  });

  it("обявата: оригинал с местоположение → в хранилището без EXIF", async () => {
    const res = await uploadListingImage("l1", form(jpeg, "image/jpeg"));
    expect(res.ok).toBe(true);
    expect(uploads).toHaveLength(1);
    await expectClean(uploads[0].body, "jpeg");
  });

  it("обявата: PNG с местоположение → без EXIF", async () => {
    await uploadListingImage("l1", form(png, "image/png"));
    await expectClean(uploads[0].body, "png");
  });

  it("профилната снимка на специалиста → без EXIF", async () => {
    const res = await uploadStaffPhoto(form(jpeg, "image/jpeg"));
    expect(res.ok).toBe(true);
    expect(uploads[0].bucket).toBe("team");
    await expectClean(uploads[0].body, "jpeg");
  });

  it("галерията от администрацията → без EXIF", async () => {
    const res = await uploadGalleryImage(
      form(jpeg, "image/jpeg", { category: "boyadisvane", width: "64", height: "48" }),
    );
    expect(res.ok).toBe(true);
    expect(uploads[0].bucket).toBe("gallery");
    await expectClean(uploads[0].body, "jpeg");
  });

  it("файл, който не се отваря като снимка: нищо не се записва, ясно съобщение", async () => {
    const broken = Buffer.concat([jpeg.subarray(0, 40), Buffer.alloc(200, 7)]);
    const res = await uploadListingImage("l1", form(broken, "image/jpeg"));
    expect(res).toEqual({
      ok: false,
      error: "Тази снимка не се отваря. Избери снимка във формат JPG, PNG или WebP.",
    });
    expect(uploads).toHaveLength(0);
  });
});
