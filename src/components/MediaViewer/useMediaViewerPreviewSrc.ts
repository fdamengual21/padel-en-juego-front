import type { MediaViewerItem } from "@/components/MediaViewer/types";
import { resolveMediaViewerSrc } from "@/components/MediaViewer/mediaViewerUtils";
import { useLocalFilePreview } from "@/components/MediaViewer/useLocalFilePreview";

export interface MediaViewerPreviewSrcResult {
  /** Ready URL for `<img>` (`blob:`, remote, or null). */
  src: string | null;
  isLoading: boolean;
}

/**
 * Resolves the preview URL for a viewer item.
 * Priority: local `File` → remote / blob `url`.
 */
export function useMediaViewerPreviewSrc(
  item: MediaViewerItem,
): MediaViewerPreviewSrcResult {
  const localPreview = useLocalFilePreview(item.file);
  const remoteSrc = item.file ? "" : resolveMediaViewerSrc(item);
  const src = item.file ? localPreview : remoteSrc || null;

  return {
    src,
    isLoading: Boolean(item.file && !localPreview),
  };
}
