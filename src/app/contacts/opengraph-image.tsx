import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/render";

export const alt = "Контакти — Euphoria, Варна";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOg({
    eyebrow: "Контакти",
    title: "Намери ни",
    subtitle: "ул. Петър Райчев 18, кв. Левски, Варна · +359 898 66 33 15",
  });
}
