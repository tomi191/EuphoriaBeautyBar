import { describe, expect, it } from "vitest";
import {
  effectiveStatus,
  fillSeat,
  listingPosition,
  listingTitle,
  nextStatus,
  sniffImageType,
  uniqueSlug,
  type ListingAction,
  type ListingStatus,
} from "./listing-rules";
import { RENTAL_BENEFITS, RENTAL_BENEFIT_KEYS, benefitsFromKeys } from "./benefits";
import { listingFacebookPost, seatsLine } from "./public-copy";

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
  it("само услуги от група «Грим» → гримьор (думата на собственика от 25.11), без нова категория", () => {
    expect(listingTitle("frizorski-uslugi", ["Грим"])).toBe("Място под наем за гримьор");
    expect(uniqueSlug(listingTitle("frizorski-uslugi", ["Грим"]), [])).toBe("myasto-pod-naem-za-grimyor");
    expect(listingPosition("frizorski-uslugi", ["Грим", "Дамско подстригване"])).toBe("фризьор");
    expect(listingPosition("frizorski-uslugi", [])).toBe("фризьор");
    expect(listingPosition("manikyur-i-pedikyur", ["Маникюр"])).toBe("маникюрист");
  });
  it("постът за грима: позицията и наемът с уточнението", () => {
    const post = listingFacebookPost("гримьор", "https://x/karieri/myasto-pod-naem-za-grimyor", {
      rent: "150",
      rentExcludes: "разходите се уговарят на място според това колко често идваш",
    });
    expect(post).toContain("Свободно е едно място под наем за гримьор в Euphoria Hair & Beauty Bar");
    expect(post).toContain(`Наем 150${String.fromCharCode(0xa0)}€ на месец, разходите се уговарят на място според това колко често идваш.`);
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

describe("местата", () => {
  it("«заето» при повече места затваря едно и пази състоянието; при последното става заета", () => {
    expect(fillSeat("published", 2)).toEqual({ status: "published", seats: 1 });
    expect(fillSeat("published", 5)).toEqual({ status: "published", seats: 4 });
    expect(fillSeat("paused", 3)).toEqual({ status: "paused", seats: 2 });
    expect(fillSeat("published", 1)).toEqual({ status: "filled", seats: 1 });
    expect(fillSeat("paused", 1)).toEqual({ status: "filled", seats: 1 });
    expect(fillSeat("draft", 2)).toBeNull();
    expect(fillSeat("filled", 2)).toBeNull();
  });
  it("множествено число само при повече от едно място", () => {
    expect(seatsLine(1)).toBeNull();
    expect(seatsLine(2)).toBe("Свободни са 2 места");
  });
  it("постът във Facebook: бройката и наемът с уточнението", () => {
    const link = "https://www.euphoriabeauty.eu/karieri/x";
    const one = listingFacebookPost("фризьор", link);
    expect(one.split("\n\n")[0]).toBe("Свободно е едно място под наем за фризьор в Euphoria Hair & Beauty Bar, кв. Левски, Варна.");
    expect(one).not.toContain("Наем");
    const two = listingFacebookPost("маникюрист", link, { seats: 2, rent: "200", rentExcludes: "без ток, вода и общи консумативи" });
    expect(two.split("\n\n")).toEqual([
      "Свободни са 2 места под наем за маникюрист в Euphoria Hair & Beauty Bar, кв. Левски, Варна.",
      "Работиш самостоятелно, със свои цени и часове. Не е трудов договор. Личен график в приложението. Подходящо и за започващи.",
      `Наем 200${String.fromCharCode(0xa0)}€ на месец, без ток, вода и общи консумативи.`,
      `Изпрати запитване от обявата: ${link}`,
    ]);
    expect(listingFacebookPost("фризьор", link, { rent: "280,5" })).toContain(`Наем 280,5${String.fromCharCode(0xa0)}€ на месец.`);
  });
});
