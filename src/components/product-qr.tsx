import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";
import { payloadForSku } from "@/lib/inventory/types";

type ProductQrProps = {
  sku: string;
  size?: number;
  className?: string;
  alt?: string;
};

export function ProductQr({ sku, size = 160, className, alt }: ProductQrProps) {
  const [src, setSrc] = useState<string | null>(null);
  const payload = payloadForSku(sku);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payload, {
      width: Math.max(128, size * 2),
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#141514", light: "#f4f1ea" },
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  if (!src) {
    return (
      <div
        className={cn("animate-pulse rounded-md bg-paper/90", className)}
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? `QR code for ${sku}`}
      width={size}
      height={size}
      className={cn("rounded-md bg-paper", className)}
      style={{ width: size, height: size }}
    />
  );
}

export async function qrDataUrl(sku: string, size = 512) {
  return QRCode.toDataURL(payloadForSku(sku), {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#141514", light: "#f4f1ea" },
  });
}
