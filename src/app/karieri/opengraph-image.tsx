import { renderRentalOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/rental";
import { RENTAL_FALLBACK_IMAGE } from "@/lib/rental/public-copy";

export const alt = "Места под наем за самостоятелни специалисти, кв. Левски, Варна";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderRentalOg({
    title: "Места под наем",
    subtitle: "за самостоятелни специалисти",
    image: RENTAL_FALLBACK_IMAGE,
  });
}
