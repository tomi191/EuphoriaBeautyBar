import { describe, expect, it } from "vitest";
import { STAFF_UPLOAD_ERRORS as E } from "@/lib/gallery/upload-rules";
import { uploadErrorField } from "./upload-error-field";

describe("uploadErrorField", () => {
  it("грешките за файла стоят под снимката", () => {
    expect(uploadErrorField(E.notImage)).toBe("file");
    expect(uploadErrorField(E.tooBig)).toBe("file");
    expect(uploadErrorField(E.tooSmall)).toBe("file");
  });
  it("услугата, думите и потвърждението стоят до полето си", () => {
    expect(uploadErrorField(E.service)).toBe("service");
    expect(uploadErrorField(E.noteTooLong)).toBe("note");
    expect(uploadErrorField(E.noFace)).toBe("noFace");
  });
  it("таванът, чуждият час и хранилището стоят над бутона", () => {
    expect(uploadErrorField(E.dailyLimit(10))).toBe("form");
    expect(uploadErrorField(E.booking)).toBe("form");
    expect(uploadErrorField(E.storage)).toBe("form");
  });
});
