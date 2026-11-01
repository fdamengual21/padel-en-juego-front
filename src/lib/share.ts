import { toastError, toastSuccess } from "@/lib/toast";

/** Celular con hoja de compartir nativa. En desktop se copia el link aunque exista `navigator.share`. */
export function isMobileShare(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

/** Baja la imagen como `File` para la hoja de compartir. Null si falla (CORS, 404, red). */
export async function fetchShareImage(url: string, name: string): Promise<File | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;
    const ext = blob.type.split("/")[1]?.split("+")[0] || "jpg";
    const safeName = name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "imagen";
    return new File([blob], `${safeName}.${ext}`, { type: blob.type });
  } catch {
    return null;
  }
}

interface ShareOrCopyInput {
  title: string;
  url: string;
  image?: File | null;
  copiedLabel: string;
}

/** Mobile: hoja nativa con imagen + link. Desktop: copia el link. */
export async function shareOrCopy({ title, url, image, copiedLabel }: ShareOrCopyInput) {
  if (isMobileShare()) {
    // WhatsApp y otras apps descartan `url` cuando hay archivos: el link va también en `text`.
    const data: ShareData = { title, text: `${title}\n${url}`, url };
    if (image && navigator.canShare?.({ files: [image] })) data.files = [image];
    try {
      await navigator.share(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toastError("No se pudo compartir");
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toastSuccess(copiedLabel);
  } catch {
    toastError("No se pudo copiar el link");
  }
}
