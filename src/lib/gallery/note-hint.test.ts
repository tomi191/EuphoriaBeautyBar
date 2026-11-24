import { describe, expect, it } from "vitest";
import { noteHintForService } from "./note-hint";

describe("noteHintForService", () => {
  it("дава примера на Саиф според услугата", () => {
    expect(noteHintForService("Гел маникюр")).toBe("Напр. „бледорозов, бадемова форма“");
    expect(noteHintForService("Педикюр с гел лак")).toBe("Напр. „червен лак, чисти кантове“");
    expect(noteHintForService("Боядисване (дълга коса)")).toBe("Напр. „кестеняво, гладка коса“");
    expect(noteHintForService("Балаяж")).toBe("Напр. „медено русо, меки вълни“");
    expect(noteHintForService("Официална прическа")).toBe("Напр. „нисък кок, оплетена кичурка“");
    expect(noteHintForService("Вечерен грим")).toBe("Напр. „опушено око, топли тонове“");
    expect(noteHintForService("Подстригване")).toBe("Напр. „цвят, форма, дължина“");
    expect(noteHintForService(null)).toBe("Напр. „цвят, форма, дължина“");
  });

  it("всяка подсказка се побира на един ред на 390 (до 43 знака)", () => {
    for (const s of ["маникюр", "педикюр", "боядисване", "балаяж", "прическа", "грим", "друго"]) {
      expect([...noteHintForService(s)].length).toBeLessThanOrEqual(43);
    }
  });
});
