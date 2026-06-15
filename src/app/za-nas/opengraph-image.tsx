import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/render";

export const alt = "За нас — Euphoria, Варна";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOg({
    eyebrow: "За нас",
    title: "Салонът на Снежана Саблева",
    subtitle: "Коса, нокти и лице на едно място — в кв. Левски, Варна.",
  });
}
