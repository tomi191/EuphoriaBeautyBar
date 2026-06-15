import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/render";

export const alt = "Кариери — Euphoria, Варна";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOg({
    eyebrow: "Кариери",
    title: "Работи при нас",
    subtitle: "Търсим специалисти, които обичат занаята си — наем на стол.",
  });
}
