import { useCallback, useState } from "react";
import type { MediaViewerItem } from "@/components/MediaViewer/types";

export interface UseMediaViewerResult {
  open: boolean;
  items: MediaViewerItem[];
  initialIndex: number;
  openViewer: (items: MediaViewerItem[], initialIndex?: number) => void;
  closeViewer: () => void;
}

/** Local open/close state for the media viewer list + start index. */
export function useMediaViewer(): UseMediaViewerResult {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaViewerItem[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);

  const openViewer = useCallback((newItems: MediaViewerItem[], index = 0) => {
    if (newItems.length === 0) return;
    setItems(newItems);
    setInitialIndex(Math.min(Math.max(index, 0), newItems.length - 1));
    setOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    items,
    initialIndex,
    openViewer,
    closeViewer,
  };
}
