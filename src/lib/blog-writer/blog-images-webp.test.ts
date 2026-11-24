import sharp from "sharp";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Решение 35: картините на блога идват от KIE като PNG, а в хранилището влиза само WebP.

const uploads = vi.hoisted(() => [] as { bucket: string; path: string; body: Buffer; type?: string }[]);

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, body: Buffer, opts: { contentType?: string }) => {
          uploads.push({ bucket, path, body: Buffer.from(body), type: opts?.contentType });
          return { error: null };
        },
      }),
    },
  }),
}));

import { generateCoverImage } from "@/lib/blog-writer/cover-image";
import { generateInlineImages } from "@/lib/blog-writer/inline-images";

let png: Buffer;

beforeAll(async () => {
  process.env.KIE_AI_API_KEY = "test";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://storage.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test";
  png = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#a8b8a0" } }).png().toBuffer();
  vi.stubGlobal("fetch", async (url: string) => {
    if (url.includes("createTask")) return Response.json({ code: 200, data: { taskId: "t1" } });
    if (url.includes("taskId=")) {
      return Response.json({ data: { state: "success", resultJson: JSON.stringify({ resultUrls: ["https://kie.test/x.png"] }) } });
    }
    return new Response(new Uint8Array(png));
  });
});

afterEach(() => {
  uploads.length = 0;
});

async function expectWebp(u: { body: Buffer; path: string; type?: string }) {
  const meta = await sharp(u.body).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(["webp", 40, 30]);
  expect(u.path).toMatch(/\.webp$/);
  expect(u.type).toBe("image/webp");
}

describe("картините на блога се записват в WebP", () => {
  it("корицата: PNG от KIE → posts/<slug>.webp", async () => {
    const res = await generateCoverImage({ slug: "proba", topic: "Балеаж" });
    expect(res?.url).toBe("http://storage.test/storage/v1/object/public/blog-images/posts/proba.webp");
    expect(uploads).toHaveLength(1);
    await expectWebp(uploads[0]);
  });

  it("снимките в текста: PNG от KIE → posts/<slug>/inline-<n>.webp", async () => {
    const res = await generateInlineImages({ slug: "proba", topic: "Балеаж", markdown: "А\n<!-- image: коса -->\nБ", maxImages: 1 });
    expect(res.count).toBe(1);
    expect(res.markdown).toContain("blog-images/posts/proba/inline-1.webp");
    expect(uploads).toHaveLength(1);
    await expectWebp(uploads[0]);
  });
});
