import { describe, expect, it } from "vitest";
import { cameFromLabel, cleanCameFrom } from "./came-from";

describe("откъде е дошло", () => {
  it("пази само from и utm_*, чисти знаците; друго (fbclid) отпада", () => {
    expect(
      cleanCameFrom("?utm_source=facebook&utm_medium=post&utm_campaign=myasto-pod-naem-za-grimyor&fbclid=IwAR0x<script>"),
    ).toBe("utm_source=facebook&utm_medium=post&utm_campaign=myasto-pod-naem-za-grimyor");
    expect(cleanCameFrom("?from=karieri")).toBe("from=karieri");
    expect(cleanCameFrom("?fbclid=abc")).toBeNull();
    expect(cleanCameFrom("")).toBeNull();
    expect(cleanCameFrom(null)).toBeNull();
  });
  it("редът в администрацията: източникът и видът; без метка няма ред", () => {
    expect(cameFromLabel("utm_source=facebook&utm_medium=post&utm_campaign=x")).toBe("Откъде: facebook, post");
    expect(cameFromLabel("from=karieri")).toBe("Откъде: karieri");
    expect(cameFromLabel(null)).toBeNull();
    expect(cameFromLabel("utm_campaign=x")).toBeNull();
  });
});
