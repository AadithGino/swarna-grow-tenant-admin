import type { LandingLogo } from "./landing-context";

export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
/** One Google Sheets cell holds 50,000 characters; stay safely under it. */
const MAX_DATA_URL_CHARS = 45000;
const SIZES = [512, 400, 320, 256, 192, 128];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Not an image"));
    img.src = src;
  });
}

/**
 * Shrinks an uploaded logo (WebP, PNG fallback) until it fits in one sheet cell.
 * Throws when the file is not an image or is over 5 MB.
 */
export async function prepareLogo(file: File): Promise<LandingLogo> {
  if (!/^image\//.test(file.type) || file.size > LOGO_MAX_BYTES) {
    throw new Error("Please choose an image under 5 MB");
  }
  const img = await loadImage(await readAsDataUrl(file));
  const w = img.naturalWidth || 512;
  const h = img.naturalHeight || 512;
  let url = "";
  for (const size of SIZES) {
    const k = Math.min(1, size / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * k));
    canvas.height = Math.max(1, Math.round(h * k));
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    url = canvas.toDataURL("image/webp", 0.86);
    if (!url.startsWith("data:image/webp")) url = canvas.toDataURL("image/png");
    if (url.length < MAX_DATA_URL_CHARS) break;
  }
  return { name: file.name, dataUrl: url };
}
