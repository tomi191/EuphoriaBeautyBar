import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/actions/faq", () => ({ createFaq: vi.fn(), updateFaq: vi.fn() }));
vi.mock("@/lib/actions/service-items", () => ({ createServiceItem: vi.fn(), updateServiceItem: vi.fn() }));
vi.mock("@/lib/actions/testimonials", () => ({ createTestimonial: vi.fn(), updateTestimonial: vi.fn() }));

import { BlogGenerateForm } from "./blog-generate-form";
import { FaqForm } from "./faq-form";
import { ServiceItemForm } from "./service-item-form";
import { TestimonialForm } from "./testimonial-form";

// Така RSC подава елемент в голям ред (над 3200 знака): мързелива връзка «$L…», не React елемент.
function lazyNode(el: React.ReactElement) {
  return { $$typeof: Symbol.for("react.lazy"), _payload: el, _init: (p: React.ReactElement) => p } as unknown as React.ReactNode;
}

const button = () => React.createElement("button", null, "Редакция");

const forms: [string, (trigger: React.ReactNode) => React.ReactElement][] = [
  ["Блог (AI статия)", (trigger) => React.createElement(BlogGenerateForm, { trigger })],
  ["ЧЗВ", (trigger) => React.createElement(FaqForm, { trigger })],
  ["Услуга", (trigger) => React.createElement(ServiceItemForm, { trigger, categoryId: "c1", groupTitles: [] })],
  ["Отзив", (trigger) => React.createElement(TestimonialForm, { trigger })],
];

describe.each(forms)("%s: бутонът, който отваря формата", (_name, render) => {
  it("рисува бутона, когато идва като обикновен елемент", () => {
    expect(renderToString(render(button()))).toContain("Редакция");
  });

  it("рисува бутона и когато идва като мързелива връзка от RSC", () => {
    expect(renderToString(render(lazyNode(button())))).toContain("Редакция");
  });
});
