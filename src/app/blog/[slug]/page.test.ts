import { describe, expect, it, vi } from "vitest";

// The page module is imported only for its route config; data access is not used here.
vi.mock("@/lib/data/blog-store", () => ({
  getPublishedPosts: vi.fn(async () => []),
  getPublishedPost: vi.fn(async () => undefined),
}));

describe("/blog/[slug] route config", () => {
  // 25.11.2026: a 404 baked into the prerender of a published post stayed until the next deploy,
  // because the page had no revalidate. A finite revalidate lets the cached 404 heal by itself.
  it("revalidates, so a cached 404 of a published post does not stay forever", async () => {
    const mod = await import("./page");
    expect(typeof mod.revalidate).toBe("number");
    expect(mod.revalidate).toBeGreaterThan(0);
    expect(mod.revalidate).toBeLessThanOrEqual(3600);
  }, 30_000);
});
