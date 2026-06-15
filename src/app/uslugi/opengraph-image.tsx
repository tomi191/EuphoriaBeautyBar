import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/render";

export const alt = "Услуги — Euphoria, Варна";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOg({
    eyebrow: "Услуги · Варна",
    title: "Нашите услуги",
    subtitle: "Фризьорство, маникюр, педикюр и козметика — в кв. Левски.",
  });
}
