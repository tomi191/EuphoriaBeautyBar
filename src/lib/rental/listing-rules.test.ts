import { describe, expect, it } from "vitest";
import {
  effectiveStatus,
  listingTitle,
  nextStatus,
  sniffImageType,
  uniqueSlug,
  type ListingAction,
  type ListingStatus,
} from "./listing-rules";
import { RENTAL_BENEFITS, RENTAL_BENEFIT_KEYS, benefitsFromKeys } from "./benefits";

describe("предимствата", () => {
  it("12 реда, уникални ключове, дословно първият и последният", () => {
    expect(RENTAL_BENEFITS).toHaveLength(12);
    expect(new Set(RENTAL_BENEFIT_KEYS).size).toBe(12);
    expect(RENTAL_BENEFITS[0]).toMatchObject({ left: "Онлайн записване по избор", right: "в сайта" });
    expect(RENTAL_BENEFITS[11]).toMatchObject({ left: "Салон в кв. Левски", right: "Варна" });
  });
  it("ключове от базата → редове в реда на списъка; непознатите отпадат", () => {
    const r = benefitsFromKeys(["location", "nope", "online-booking"]);
    expect(r.map((b) => b.key)).toEqual(["online-booking", "location"]);
  });
});

describe("състоянията", () => {
  const all: ListingStatus[] = ["draft", "published", "filled", "paused"];
  const expected: Record<ListingAction, Partial<Record<ListingStatus, ListingStatus>>> = {
    publish: { draft: "published" },
    pause: { published: "paused" },
    fill: { published: "filled", paused: "filled" },
    reopen: { filled: "published", paused: "published" },
    release: { filled: "paused" },
  };
  for (const action of Object.keys(expected) as ListingAction[]) {
    for (const from of all) {
      const to = expected[action][from] ?? null;
      it(`${action}: ${from} → ${to ?? "отказ"}`, () => {
        expect(nextStatus(from, action)).toBe(to);
      });
    }
  }
  it("стар ред без състояние: active → публикувана, иначе спряна", () => {
    expect(effectiveStatus({ status: null, active: true })).toBe("published");
    expect(effectiveStatus({ status: null, active: false })).toBe("paused");
    expect(effectiveStatus({ status: "draft", active: true })).toBe("draft");
  });
});

describe("заглавие и адрес", () => {
  it("заглавието идва от категорията", () => {
    expect(listingTitle("manikyur-i-pedikyur")).toBe("Място под наем за маникюрист");
    expect(listingTitle("kozmetika")).toBe("Място под наем за козметик");
    expect(listingTitle("frizorski-uslugi")).toBe("Място под наем за фризьор");
    expect(listingTitle("frizorski-terapii")).toBe("Място под наем за фризьор");
    expect(listingTitle("nova-kategoriya")).toBe("Място под наем за специалист");
  });
  it("адресът е латиница от кирилицата и е уникален", () => {
    const title = listingTitle("manikyur-i-pedikyur");
    expect(uniqueSlug(title, [])).toBe("myasto-pod-naem-za-manikyurist");
    expect(uniqueSlug(title, ["myasto-pod-naem-za-manikyurist"])).toBe("myasto-pod-naem-za-manikyurist-2");
    expect(
      uniqueSlug(title, ["myasto-pod-naem-za-manikyurist", "myasto-pod-naem-za-manikyurist-2"]),
    ).toBe("myasto-pod-naem-za-manikyurist-3");
    expect(uniqueSlug("Щастие Ъгъл", [])).toBe("shtastie-agal");
    expect(uniqueSlug("!!!", [])).toBe("myasto");
  });
});

describe("снимката по първите байтове", () => {
  const u = (...n: number[]) => new Uint8Array(n);
  it("JPEG, PNG, WebP се познават", () => {
    expect(sniffImageType(u(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(u(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    expect(sniffImageType(u(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
  });
  it("SVG, HTML, празно и RIFF без WEBP се отказват", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<html>"))).toBeNull();
    expect(sniffImageType(u())).toBeNull();
    expect(sniffImageType(u(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x41, 0x56, 0x49, 0x20))).toBeNull();
  });
});
