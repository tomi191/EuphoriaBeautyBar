import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { startFakeStorage, type FakeStorage } from "@/lib/gallery/fake-storage.testkit";

// «Екип» (/admin/team): качване на снимка като при «Изпълнители» и пазене на файла, докато член го ползва.
const state = vi.hoisted(() => ({
  teamImage: null as string | null, // снимката на члена в базата
  resourceImage: null as string | null,
  updates: [] as Record<string, unknown>[],
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/actions/auth-guard", () => ({ requireAdmin: vi.fn(async () => ({ user: { role: "admin" } })) }));
vi.mock("@/lib/db", async () => {
  const schema = await vi.importActual<typeof import("@/lib/db/schema")>("@/lib/db/schema");
  // where: (t, { eq }) => eq(t.image, url) → тук само сравняваме стойността.
  const pick = (rowImage: () => string | null) => async (opts: { where: (t: unknown, ops: unknown) => unknown }) => {
    let wanted: unknown;
    opts.where({ image: "image", id: "id" }, { eq: (_c: unknown, v: unknown) => (wanted = v) });
    const img = rowImage();
    if (wanted === "member-1") return { image: img };
    return img && img === wanted ? { id: "x" } : undefined;
  };
  return {
    schema,
    db: {
      query: {
        teamMembers: { findFirst: pick(() => state.teamImage) },
        resources: { findFirst: pick(() => state.resourceImage) },
      },
      update: () => ({
        set: (v: Record<string, unknown>) => ({
          where: async () => {
            state.updates.push(v);
            state.teamImage = (v.image as string | null) ?? null;
          },
        }),
      }),
    },
  };
});

let fake: FakeStorage;
beforeAll(async () => {
  fake = await startFakeStorage();
  process.env.NEXT_PUBLIC_SUPABASE_URL = fake.url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = fake.key;
});
afterAll(async () => fake?.close());
beforeEach(() => {
  state.teamImage = null;
  state.resourceImage = null;
  state.updates = [];
});

async function jpeg(width = 1200, height = 1600) {
  const buf = await sharp({ create: { width, height, channels: 3, background: { r: 140, g: 180, b: 160 } } })
    .jpeg()
    .withExif({ IFD0: { Make: "ProbaPhone" } })
    .toBuffer();
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array(buf)], "silvia.jpg", { type: "image/jpeg" }));
  return fd;
}

const fileOf = (url: string) => fake.buckets.get("team")?.files.get(url.split("/team/")[1]);

describe("снимка на член в «Екип»", () => {
  it("«Качи снимка» → WebP до 600×750 в публичното хранилище «team»", async () => {
    const { uploadTeamMemberPhoto } = await import("@/lib/actions/team");
    const res = await uploadTeamMemberPhoto(await jpeg());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.url.startsWith(`${fake.url}/storage/v1/object/public/team/member-`)).toBe(true);
    const f = fileOf(res.url);
    expect(f?.type).toBe("image/webp");
    const meta = await sharp(f!.body).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(meta.height).toBe(750);
  });

  it("файл, който не е снимка → ясен отказ, нищо не се качва", async () => {
    const { uploadTeamMemberPhoto } = await import("@/lib/actions/team");
    const fd = new FormData();
    fd.append("file", new File([new TextEncoder().encode("<svg></svg>")], "x.jpg", { type: "image/jpeg" }));
    const res = await uploadTeamMemberPhoto(fd);
    expect(res.ok).toBe(false);
  });

  it("смяна на снимката при «Запази» трие старата от хранилището, новата остава", async () => {
    const { uploadTeamMemberPhoto, updateTeamMember } = await import("@/lib/actions/team");
    const a = await uploadTeamMemberPhoto(await jpeg());
    const b = await uploadTeamMemberPhoto(await jpeg());
    if (!a.ok || !b.ok) throw new Error("качването не мина");
    state.teamImage = a.url;
    await updateTeamMember("member-1", { name: "Силвия", role: "медицински козметик", bio: "Десет знака и още.", experience: "15", image: b.url, specialties: [], active: true });
    expect(state.updates.at(-1)?.image).toBe(b.url);
    expect(fileOf(a.url)).toBeUndefined();
    expect(fileOf(b.url)).toBeDefined();
  });

  it("снимка, която член на екипа ползва, не се трие отвън (напр. при смяна у изпълнител)", async () => {
    const { uploadTeamMemberPhoto } = await import("@/lib/actions/team");
    const { removeTeamPhotoIfUnused } = await import("@/lib/images/team-photo");
    const a = await uploadTeamMemberPhoto(await jpeg());
    if (!a.ok) throw new Error("качването не мина");
    state.teamImage = a.url;
    await removeTeamPhotoIfUnused(a.url);
    expect(fileOf(a.url)).toBeDefined();
  });
});
