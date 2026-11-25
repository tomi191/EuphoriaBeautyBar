import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";

vi.mock("@/lib/actions/team", () => ({
  createTeamMember: vi.fn(),
  updateTeamMember: vi.fn(),
  uploadTeamMemberPhoto: vi.fn(),
  discardTeamMemberPhoto: vi.fn(),
}));
vi.mock("@/components/admin/gallery-upload-form", () => ({ prepareFile: vi.fn() }));

import { TeamForm } from "./team-form";

// Така RSC подава елемент в голям ред (над 3200 знака): мързелива връзка «$L…», не React елемент.
function lazyNode(el: React.ReactElement) {
  return { $$typeof: Symbol.for("react.lazy"), _payload: el, _init: (p: React.ReactElement) => p } as unknown as React.ReactNode;
}

describe("TeamForm: бутонът, който отваря формата", () => {
  it("рисува «Редакция», когато бутонът идва като обикновен елемент", () => {
    const html = renderToString(React.createElement(TeamForm, { trigger: React.createElement("button", null, "Редакция") }));
    expect(html).toContain("Редакция");
  });

  it("рисува «Редакция» и когато бутонът идва като мързелива връзка от RSC (редът на Силвия)", () => {
    const html = renderToString(React.createElement(TeamForm, { trigger: lazyNode(React.createElement("button", null, "Редакция")) }));
    expect(html).toContain("Редакция");
  });
});
