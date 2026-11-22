import { describe, it, expect } from "vitest";
import { searchServices } from "./service-search";

// Откъс от каталога (имената като на живата страница, 22.11.2026).
const svc = (name: string, groupTitle: string, category = "Фризьор") => ({ name, groupTitle, category });
const CATALOG = [
  svc("Дамско подстригване (къса коса)", "Подстригване и оформяне"),
  svc("Дамско подстригване (дълга коса)", "Подстригване и оформяне"),
  svc("Мъжко подстригване", "Подстригване и оформяне"),
  svc("Сешоар (къса коса)", "Подстригване и оформяне"),
  svc("Сешоар (дълга коса)", "Подстригване и оформяне"),
  svc("Официална прическа", "Подстригване и оформяне"),
  svc("Боядисване (къса коса)", "Боядисване"),
  svc("Боядисване (дълга коса)", "Боядисване"),
  svc("Балаяж (средна коса)", "Балаяж"),
  svc("Балаяж (дълга коса)", "Балаяж"),
  svc("Кичури на фолио (къса коса)", "Кичури на фолио"),
  svc("Ламеларна вода", "Терапии за коса", "Терапии"),
  svc("Ботокс терапия за коса (Xtreme Hydra)", "Терапии за коса", "Терапии"),
  svc("Маникюр с гел лак", "Маникюр", "Маникюр"),
  svc("Боядисване вежди", "Вежди и мигли", "Козметика"),
];
const names = (q: string) => searchServices(CATALOG, q).map((s) => s.name);

describe("searchServices: word by word", () => {
  it("finds „боядисване на коса“, which the old whole-phrase search missed", () => {
    expect(names("боядисване на коса")).toEqual(
      expect.arrayContaining(["Боядисване (къса коса)", "Боядисване (дълга коса)"]),
    );
  });

  it("finds „цена балаяж“ and „подстригване варна“", () => {
    expect(names("цена балаяж")).toEqual(["Балаяж (средна коса)", "Балаяж (дълга коса)"]);
    // Видът „Подстригване и оформяне“ също съдържа думата, както в старото търсене.
    expect(names("подстригване варна")).toEqual(names("подстригване"));
    expect(names("подстригване варна")).toEqual(
      expect.arrayContaining(["Дамско подстригване (къса коса)", "Мъжко подстригване"]),
    );
  });

  it("needs every remaining word: „боядисване вежди“ is only the brow service", () => {
    expect(names("боядисване на вежди")).toEqual(["Боядисване вежди"]);
  });

  it("keeps the old single-word search", () => {
    expect(names("балаяж")).toEqual(["Балаяж (средна коса)", "Балаяж (дълга коса)"]);
    expect(names("Сешоар")).toHaveLength(2);
  });

  it("returns nothing below two letters or for an unknown word", () => {
    expect(names("б")).toEqual([]);
    expect(names("екзотика")).toEqual([]);
  });

  it("caps the list at 8", () => {
    expect(searchServices(CATALOG, "коса").length).toBeLessThanOrEqual(8);
    expect(searchServices(CATALOG, "коса").length).toBeGreaterThan(0);
  });
});

describe("searchServices: synonyms", () => {
  it("„балеаж“ and the other spellings lead to Балаяж", () => {
    for (const q of ["балеаж", "балеяж", "балайаж", "балаж", "баляж", "балиаж", "balayage", "Balayazh"]) {
      expect(names(q)).toEqual(["Балаяж (средна коса)", "Балаяж (дълга коса)"]);
    }
  });

  it("„балеаж на тъмна коса“ skips the unknown word „тъмна“", () => {
    expect(names("балеаж на тъмна коса")).toEqual(["Балаяж (средна коса)", "Балаяж (дълга коса)"]);
  });

  it("narrows a synonym by a remaining word: „балеаж дълга“", () => {
    expect(names("балеаж дълга")).toEqual(["Балаяж (дълга коса)"]);
  });

  it("the longest phrase wins: „мъжка прическа“ is not „Официална прическа“", () => {
    expect(names("мъжка прическа")).toEqual(["Мъжко подстригване"]);
    expect(names("сватбена прическа")).toEqual(["Официална прическа"]);
  });

  it("maps other clear rows", () => {
    expect(names("боя за коса")).toEqual(["Боядисване (къса коса)", "Боядисване (дълга коса)"]);
    expect(names("мелиране")).toEqual(["Кичури на фолио (къса коса)"]);
    expect(names("брашинг")).toEqual(["Сешоар (къса коса)", "Сешоар (дълга коса)"]);
    expect(names("ламинарна вода")).toEqual(["Ламеларна вода"]);
    expect(names("гелак")).toEqual(["Маникюр с гел лак"]);
  });

  it("a synonym is silent when its service is not in the catalog", () => {
    expect(names("визаж")).toEqual([]);
  });

  it("does not apply the rows waiting for Снежана", () => {
    expect(names("маша")).toEqual([]);
    expect(names("смяна на цвят")).toEqual([]);
  });
});

describe("searchServices: words without a service", () => {
  it("ombre, shatush, extensions and face botox give zero", () => {
    expect(names("омбре")).toEqual([]);
    expect(names("шатуш")).toEqual([]);
    expect(names("екстеншъни")).toEqual([]);
    expect(names("ботокс на лице")).toEqual([]);
  });

  it("„ботокс“ alone still finds the hair therapy", () => {
    expect(names("ботокс")).toEqual(["Ботокс терапия за коса (Xtreme Hydra)"]);
  });
});
