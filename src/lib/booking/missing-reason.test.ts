import { describe, expect, it } from "vitest";
import { missingReason } from "./missing-reason";

const full = {
  service: true,
  performer: true,
  slot: true,
  name: "Мария",
  phone: "0888 123 456",
  email: "maria@gmail.com",
  consent: true,
};

describe("missingReason", () => {
  it("returns null when everything is filled", () => {
    expect(missingReason(full)).toBeNull();
  });

  it("lists two or more missing items in the fixed order with «и» before the last", () => {
    expect(missingReason({ ...full, name: "", phone: "" })).toBe("За да запазиш, остава: име и телефон.");
    expect(missingReason({ ...full, slot: false, name: "", phone: "" })).toBe("За да запазиш, остава: час, име и телефон.");
    expect(missingReason({ ...full, slot: false, name: "", phone: "", email: "", consent: false })).toBe(
      "За да запазиш, остава: час, име, телефон, имейл и съгласие.",
    );
  });

  it("gives the single sentence when one thing is missing", () => {
    expect(missingReason({ ...full, slot: false })).toBe("Липсва час. Избери един от свободните.");
    expect(missingReason({ ...full, name: "М" })).toBe("Липсва име. Напиши поне две букви.");
    expect(missingReason({ ...full, consent: false })).toBe("Липсва съгласие. Отбележи, че приемаш условията.");
    expect(missingReason({ ...full, performer: false })).toBe("Избери специалист.");
  });

  it("tells an empty email from an incomplete one", () => {
    expect(missingReason({ ...full, email: "" })).toBe("Липсва имейл. На него пращаме потвърждението.");
    expect(missingReason({ ...full, email: "maria@gmail" })).toBe(
      "Имейлът изглежда непълен. Провери за @ и домейн, например ime@gmail.com.",
    );
  });
});
