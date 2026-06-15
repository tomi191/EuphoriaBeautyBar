import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/render";

export const alt = "Журнал — Euphoria, Варна";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOg({
    eyebrow: "Журнал",
    title: "Съвети за коса, нокти и кожа",
    subtitle: "Практични статии от салона — без празни обещания.",
  });
}
