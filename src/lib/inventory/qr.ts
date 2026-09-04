import jsQR from "jsqr";
import { payloadForSku } from "./types";

export { payloadForSku };

export function parseQrPayload(raw: string): string {
  const text = raw.trim();
  if (!text) return "";

  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && "sku" in parsed) {
      const sku = (parsed as { sku: unknown }).sku;
      if (typeof sku === "string" && sku.trim()) return sku.trim();
    }
  } catch {
    // not JSON
  }

  const prefixed = /^(?:shelfmark|sm)[:\s/|-]+(.+)$/i.exec(text);
  if (prefixed?.[1]) return prefixed[1].trim();

  return text;
}

function decodeImageData(imageData: ImageData): string | null {
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data ?? null;
}

export function decodeQrFromCanvas(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    return decodeImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
  } catch {
    return null;
  }
}

export async function decodeQrFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): Promise<string | null> {
  if (video.readyState < 2) return null;
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);

  const native = await detectNative(canvas);
  if (native) return native;
  return decodeQrFromCanvas(canvas);
}

export async function decodeQrFromFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    const native = await detectNative(canvas);
    if (native) return native;
    return decodeQrFromCanvas(canvas);
  } finally {
    bitmap.close();
  }
}

export async function decodeQrFromDataUrl(dataUrl: string): Promise<string | null> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  const native = await detectNative(canvas);
  if (native) return native;
  return decodeQrFromCanvas(canvas);
}

type NativeDetector = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

async function detectNative(source: HTMLCanvasElement): Promise<string | null> {
  const Detector = (
    globalThis as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => NativeDetector;
    }
  ).BarcodeDetector;
  if (!Detector) return null;
  try {
    const detector = new Detector({ formats: ["qr_code"] });
    const codes = await detector.detect(source);
    const value = codes[0]?.rawValue;
    return value ? value : null;
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}
