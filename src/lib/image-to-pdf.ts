import "server-only";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

/**
 * Converts an arbitrary picture (jpg/png/webp/heic/etc.) into a single-page PDF, one
 * attachment per page's worth of image, matching the "photos are converted to PDF"
 * requirement. Runs server-side so it works the same regardless of which browser/device
 * the picture was taken on.
 */
export async function convertImageToPdf(input: Buffer): Promise<Buffer> {
  // Normalize to a plain JPEG first — this covers heic/webp/png/etc. uniformly and keeps
  // file size reasonable. sharp() auto-rotates using EXIF orientation via .rotate().
  const normalized = await sharp(input).rotate().jpeg({ quality: 90 }).toBuffer();
  const meta = await sharp(normalized).metadata();
  const width = meta.width ?? 1000;
  const height = meta.height ?? 1414;

  const pdfDoc = await PDFDocument.create();
  const jpgImage = await pdfDoc.embedJpg(normalized);

  const page = pdfDoc.addPage([width, height]);
  page.drawImage(jpgImage, { x: 0, y: 0, width, height });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export function isLikelyImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
