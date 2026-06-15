import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/render";

export const alt = "Галерия — Euphoria, Варна";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOg({
    eyebrow: "Галерия",
    title: "Резултати от салона",
    subtitle: "Прически, цвят, нокти и грижа за кожата — реални работи.",
  });
}
