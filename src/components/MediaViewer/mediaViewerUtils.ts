import type {
  MediaViewerFileKind,
  MediaViewerItem,
} from "@/components/MediaViewer/types";

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "svg",
]);
const PDF_EXTENSIONS = new Set(["pdf"]);

function getExtension(value: string): string {
  const trimmed = value.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot === -1 || lastDot === trimmed.length - 1) return "";
  return trimmed.slice(lastDot + 1).toLowerCase();
}

function downloadBlobFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** Infers image / pdf / other from MIME, extension, or explicit kind. */
export function inferMediaViewerKind(item: MediaViewerItem): MediaViewerFileKind {
  if (item.kind) return item.kind;

  const mime = (item.mimeType ?? item.file?.type ?? "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";

  const nameExt = item.name ? getExtension(item.name) : "";
  const urlExt = item.url ? getExtension(item.url.split("?")[0] ?? "") : "";
  const ext = nameExt || urlExt;

  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (PDF_EXTENSIONS.has(ext)) return "pdf";
  return "other";
}

/** UI / download name; falls back to indexed label. */
export function getMediaViewerDisplayName(
  item: MediaViewerItem,
  index: number,
): string {
  const trimmed = item.name?.trim();
  if (trimmed) return trimmed;
  const kind = inferMediaViewerKind(item);
  if (kind === "image") return `Imagen ${index + 1}`;
  if (kind === "pdf") return `Documento ${index + 1}.pdf`;
  return `Archivo ${index + 1}`;
}

/** Ready URL for `<img src>` when the item is remote (not a local File). */
export function resolveMediaViewerSrc(item: MediaViewerItem): string {
  if (item.file) return "";
  return item.url?.trim() ?? "";
}

/** Downloads one item (local file or remote URL). */
export async function downloadMediaViewerItem(
  item: MediaViewerItem,
  index: number,
): Promise<void> {
  if (item.onDownload) {
    await item.onDownload();
    return;
  }

  const fileName = getMediaViewerDisplayName(item, index);

  if (item.file) {
    downloadBlobFile(item.file, fileName);
    return;
  }

  const url = resolveMediaViewerSrc(item);
  if (!url) return;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("No se pudo descargar la imagen.");
    const blob = await response.blob();
    downloadBlobFile(blob, fileName);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/** Downloads every item with a short pause between files. */
export async function downloadAllMediaViewerItems(
  items: MediaViewerItem[],
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    await downloadMediaViewerItem(items[i], i);
    if (i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

/** Builds viewer items from URL entries. */
export function toMediaViewerItemsFromUrls(
  entries: Array<{
    id: string;
    url: string;
    name?: string;
    description?: string;
    mimeType?: string;
  }>,
): MediaViewerItem[] {
  return entries.map(({ id, url, name, description, mimeType }) => {
    const item: MediaViewerItem = {
      id,
      url,
      name: name?.trim() || undefined,
      description: description?.trim() || undefined,
      mimeType: mimeType?.trim() || undefined,
    };
    return { ...item, kind: inferMediaViewerKind(item) };
  });
}

/** Builds viewer items from local files. */
export function toMediaViewerItemsFromFiles(files: File[]): MediaViewerItem[] {
  return files.map((file, index) => {
    const item: MediaViewerItem = {
      id: `local-${file.name}-${file.size}-${index}`,
      file,
      name: file.name,
      mimeType: file.type,
    };
    return { ...item, kind: inferMediaViewerKind(item) };
  });
}

/** Merges persisted and local items into one list. */
export function mergeMediaViewerItems(
  persisted: MediaViewerItem[],
  local: MediaViewerItem[],
): MediaViewerItem[] {
  return [...persisted, ...local];
}
