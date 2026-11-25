import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServiceCategory } from "@/lib/data/services";
import { SERVICE_FAQ, SERVICE_INTRO } from "@/lib/data/service-faq";

// №12 (решение 42): /llms.txt и /llms-full.txt не показват суровите {price:…}, {min:…}, {book:…}.
const state = vi.hoisted(() => ({ catalog: [] as unknown[] }));
vi.mock("@/lib/db", () => ({ db: { query: { siteSettings: { findFirst: async () => null } } } }));
vi.mock("@/lib/data/service-catalog", () => ({ getServiceCatalog: async () => state.catalog }));
vi.mock("@/lib/data/faq-db", () => ({ getFaqItems: async () => [] }));
vi.mock("@/lib/data/blog-store", () => ({ getPublishedPosts: async () => [] }));
vi.mock("@/lib/campaigns/public", () => ({ loadRunningCampaigns: async () => [] }));

import { renderLlmsFullTxt, renderLlmsTxt } from "./llms";

const RAW = /\{(price|Price|min|book):/;

/** Всички услуги, които текстовете назовават, с цена 25 € и 75 минути; `skip` липсва в каталога. */
function catalogFor(skip?: string): ServiceCategory[] {
  const texts = [...Object.values(SERVICE_FAQ).flat().map((f) => f.answer), ...Object.values(SERVICE_INTRO).flat()];
  const names = new Set([...texts.join(" ").matchAll(/\{(?:price|Price|min):([^}]+)\}/g)].map((m) => m[1]));
  if (skip) names.delete(skip);
  const items = [...names].map((name) => ({ name, price: 25, priceFrom: false, currency: "€", durationMin: 75 }));
  return Object.keys({ ...SERVICE_FAQ, ...SERVICE_INTRO }).map((slug) => ({
    slug,
    title: slug,
    description: "Описание.",
    groups: [{ title: "Група", items }],
  })) as unknown as ServiceCategory[];
}

describe("llms.txt и llms-full.txt", () => {
  beforeEach(() => {
    state.catalog = catalogFor();
  });

  it("llms-full.txt: цените и минутите от ценоразписа, без сурови знаци", async () => {
    const out = await renderLlmsFullTxt();
    expect(out).not.toMatch(RAW);
    expect(out).toContain("**Колко струва маникюр с гел лак във Варна?**\n25 €.");
    expect(out).toContain("Часът в записването е 75 минути.");
  });

  it("llms.txt: без сурови знаци", async () => {
    expect(await renderLlmsTxt()).not.toMatch(RAW);
  });

  it("услуга без цена в ценоразписа: въпросът отпада, цена не се измисля", async () => {
    state.catalog = catalogFor("Маникюр с гел лак");
    const out = await renderLlmsFullTxt();
    expect(out).not.toMatch(RAW);
    expect(out).not.toContain("Колко струва маникюр с гел лак във Варна?");
  });
});
