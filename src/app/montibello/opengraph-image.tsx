import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/render";

export const alt = "Montibello — Euphoria, Варна";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOg({
    eyebrow: "Партньорска марка",
    title: "Montibello",
    subtitle: "Професионалната испанска грижа за коса, с която работим.",
  });
}
