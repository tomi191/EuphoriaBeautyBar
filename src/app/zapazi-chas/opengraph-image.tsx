import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/render";

export const alt = "Запази час — Euphoria, Варна";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOg({
    eyebrow: "Онлайн записване",
    title: "Запази час",
    subtitle: "Избери услуга, специалист и свободен час — по всяко време.",
  });
}
