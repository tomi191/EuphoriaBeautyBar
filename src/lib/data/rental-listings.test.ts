import { beforeEach, describe, expect, it, vi } from "vitest";

// Публичните четения: бележката за администратора, «заета от» и Facebook не излизат дори ако
// базата ги върне; старият ред без категория се чете. Базата е мок (верига select…).
const m = vi.hoisted(() => ({ selections: [] as Record<string, unknown>[], results: [] as unknown[][] }));

vi.mock("@/lib/db", async () => {
  const schema = await vi.importActual<typeof import("@/lib/db/schema")>("@/lib/db/schema");
  const chain = () => {
    const rows = m.results.shift() ?? [];
    const c: Record<string, unknown> = {};
    for (const k of ["from", "leftJoin", "where", "orderBy", "limit"]) c[k] = () => c;
    c.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(rows).then(res, rej);
    return c;
  };
  return {
    schema,
    db: {
      select: (cols: Record<string, unknown>) => {
        m.selections.push(cols);
        return chain();
      },
    },
  };
});

import { getListingBySlug, getOpenListings, hasOpenListings } from "./rental-listings";

const SECRET = "ТАЙНА-бележка-наем-300";
const base = {
  id: "p1",
  slug: "myasto-pod-naem-za-manikyurist",
  title: "Място под наем за маникюрист",
  status: "published",
  active: true,
  image: null,
  benefits: ["location", "online-booking"],
  serviceIds: ["s2", "s1", "gone"],
  publishedAt: new Date("2026-11-22T10:00:00Z"),
  description: "",
  skills: [],
  catId: "c1",
  catSlug: "manikyur-i-pedikyur",
  catTitle: "Маникюр и педикюр",
  catShortTitle: "Маникюр",
  // Каквото базата не бива да дава, но и да го даде, не излиза:
  adminNote: SECRET,
  filledByResourceId: "r-secret",
  fbPostId: "123_456",
};

beforeEach(() => {
  m.selections.length = 0;
  m.results.length = 0;
});

describe("публичните четения на обявите", () => {
  it("не искат и не връщат бележката, «заета от» и Facebook", async () => {
    m.results.push([base], [
      { id: "s1", name: "Гел лак", groupTitle: "Маникюр" },
      { id: "s2", name: "Изграждане", groupTitle: "Маникюр" },
    ]);
    const list = await getOpenListings();
    m.results.push([base], []);
    const one = await getListingBySlug(base.slug);

    for (const sel of m.selections) {
      for (const k of Object.keys(sel)) expect(k).not.toMatch(/note|filled|fb/i);
    }
    const out = JSON.stringify([list, one]);
    expect(out).not.toContain(SECRET);
    expect(out).not.toContain("r-secret");
    expect(out).not.toContain("123_456");
    expect(Object.keys(list[0])).not.toContain("adminNote");
  });

  it("сглобява категорията, услугите в избрания ред и предимствата", async () => {
    m.results.push([base], [
      { id: "s1", name: "Гел лак", groupTitle: "Маникюр" },
      { id: "s2", name: "Изграждане", groupTitle: "Маникюр" },
    ]);
    const [l] = await getOpenListings();
    expect(l.category).toEqual({ id: "c1", slug: "manikyur-i-pedikyur", title: "Маникюр и педикюр", shortTitle: "Маникюр" });
    expect(l.services.map((s) => s.id)).toEqual(["s2", "s1"]); // изтритата отпада
    expect(l.benefits.map((b) => b.key)).toEqual(["online-booking", "location"]);
    expect(l.status).toBe("published");
  });

  it("стар ред без категория, без адрес и без състояние се чете", async () => {
    m.results.push([
      {
        ...base,
        id: "legacy-1",
        slug: null,
        title: "Маникюрист (стар ред)",
        status: null,
        benefits: [],
        serviceIds: [],
        publishedAt: null,
        description: "Стара обява",
        skills: ["гел"],
        catId: null,
        catSlug: null,
        catTitle: null,
        catShortTitle: null,
      },
    ]);
    const [l] = await getOpenListings();
    expect(l).toMatchObject({ id: "legacy-1", slug: null, category: null, services: [], status: "published", skills: ["гел"] });
  });

  it("по адрес: няма такава → null; заета се връща като «заета»", async () => {
    m.results.push([]);
    expect(await getListingBySlug("nyama")).toBeNull();
    m.results.push([{ ...base, status: "filled", active: false, serviceIds: [] }]);
    expect((await getListingBySlug(base.slug))?.status).toBe("filled");
  });

  it("има ли отворена обява", async () => {
    m.results.push([{ id: "p1" }]);
    expect(await hasOpenListings()).toBe(true);
    m.results.push([]);
    expect(await hasOpenListings()).toBe(false);
  });
});
