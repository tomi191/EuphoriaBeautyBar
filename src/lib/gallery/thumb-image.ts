import sharp from "sharp";
import { THUMB_WIDTH } from "@/lib/gallery/thumb";

/** Малкото копие за плочката: до 600 px широко, WebP. По-малка снимка не се уголемява. */
export function makeGalleryThumb(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
}
