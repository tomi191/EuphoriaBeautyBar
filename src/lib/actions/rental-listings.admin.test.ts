import { describe, expect, it, vi } from "vitest";

// Само администратор: всяко действие на формата «Нова обява» и прегледът ѝ спират на проверката
// на сървъра, преди да пипнат базата, ако влезлият е специалист (role: staff) или няма вход.
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; role: string } } }));
const dbTouched = vi.hoisted(() => ({ count: 0 }));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => session.current } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/db", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/schema")>("@/lib/db/schema");
  const trap = new Proxy({}, { get: () => { dbTouched.count++; throw new Error("DB_TOUCHED"); } });
  return { db: trap, schema: actual };
});

import {
  createListingDraft,
  markListingFilled,
  pauseListing,
  publishListing,
  reopenListing,
  updateListing,
  uploadListingImage,
} from "@/lib/actions/rental-listings";
import ListingPreviewPage from "@/app/admin/listing-preview/page";

const calls: [string, () => Promise<unknown>][] = [
  ["createListingDraft", () => createListingDraft({ categoryId: "c1" })],
  ["updateListing", () => updateListing("l1", { customBenefits: ["ред"], rentPublic: true, rentText: "300" })],
  ["publishListing", () => publishListing("l1")],
  ["pauseListing", () => pauseListing("l1")],
  ["markListingFilled", () => markListingFilled("l1", "r1")],
  ["reopenListing", () => reopenListing("l1")],
  ["uploadListingImage", () => uploadListingImage("l1", new FormData())],
  ["прегледът /admin/listing-preview", () => ListingPreviewPage()],
];

describe("формата «Нова обява»: само администратор", () => {
  for (const who of [null, { user: { id: "u1", role: "staff" } }]) {
    for (const [name, call] of calls) {
      it(`${name}: ${who ? "специалист" : "без вход"} → към входа, базата не е пипната`, async () => {
        session.current = who;
        dbTouched.count = 0;
        await expect(call()).rejects.toThrow("REDIRECT:/admin/login");
        expect(dbTouched.count).toBe(0);
      });
    }
  }
});
