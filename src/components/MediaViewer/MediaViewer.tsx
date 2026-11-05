import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileIcon,
  FolderArchive,
  LoaderCircle,
  RotateCw,
  Trash2,
  XIcon,
} from "lucide-react";
import type { MediaViewerItem } from "@/components/MediaViewer/types";
import {
  downloadAllMediaViewerItems,
  downloadMediaViewerItem,
  getMediaViewerDisplayName,
  inferMediaViewerKind,
  resolveMediaViewerSrc,
} from "@/components/MediaViewer/mediaViewerUtils";
import { nextClockwiseImageRotationDeg } from "@/components/MediaViewer/imageRotation";
import { useLocalFilePreview } from "@/components/MediaViewer/useLocalFilePreview";
import { useMediaViewerPreviewSrc } from "@/components/MediaViewer/useMediaViewerPreviewSrc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface MediaViewerProps {
  open: boolean;
  items: MediaViewerItem[];
  initialIndex?: number;
  onClose: () => void;
  /** Bulk download; when set, replaces sequential per-item download. */
  onDownloadAll?: () => Promise<void>;
  onDownloadError?: (message: string) => void;
  /**
   * Shows download controls in the toolbar.
   * Default `true`. Use `false` on public read-only surfaces if needed.
   */
  allowDownload?: boolean;
  /** When true, shows delete for the current item (if `onDelete` is set). */
  canDelete?: boolean;
  isDeleting?: boolean;
  onDelete?: (item: MediaViewerItem) => void;
}

function ToolbarIconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label={label}
          className="bg-black/35 text-white hover:bg-black/55 hover:text-white disabled:opacity-50"
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function MediaViewerMainContent({
  item,
  index,
  rotationDeg,
}: {
  item: MediaViewerItem;
  index: number;
  rotationDeg: number;
}) {
  const kind = inferMediaViewerKind(item);
  const { src, isLoading } = useMediaViewerPreviewSrc(item);
  const displayName = getMediaViewerDisplayName(item, index);
  const isQuarterTurn = rotationDeg % 180 !== 0;

  if (kind !== "image") {
    return (
      <div className="flex flex-col items-center gap-3 px-4 text-center">
        <FileIcon className="size-16 text-white/80" />
        <p className="text-lg font-medium text-white">{displayName}</p>
        <p className="text-sm text-white/60">
          Vista previa no disponible para este tipo de archivo.
        </p>
      </div>
    );
  }

  if (isLoading || !src) {
    return <LoaderCircle className="size-8 animate-spin text-white" />;
  }

  return (
    <img
      src={src}
      alt={displayName}
      className={cn(
        "object-contain select-none transition-transform duration-200",
        isQuarterTurn
          ? "max-h-full max-w-[calc(100dvh-11rem)]"
          : "max-h-[calc(100dvh-11rem)] max-w-full",
      )}
      style={{ transform: `rotate(${rotationDeg}deg)` }}
    />
  );
}

function MediaViewerThumbnail({
  item,
  index,
  selected,
  onSelect,
}: {
  item: MediaViewerItem;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const kind = inferMediaViewerKind(item);
  const remoteSrc = item.file ? null : resolveMediaViewerSrc(item);
  const localPreview = useLocalFilePreview(item.file);
  const src = item.file ? localPreview : remoteSrc;

  return (
    <button
      type="button"
      aria-label={`Ver archivo ${index + 1}`}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
      className={cn(
        "flex size-[4.5rem] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 bg-white/10",
        selected ? "border-primary outline outline-2 outline-primary/40" : "border-transparent",
      )}
    >
      {kind === "image" && src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : kind === "image" && !src ? (
        <LoaderCircle className="size-5 animate-spin text-white" />
      ) : (
        <FileIcon className="size-8 text-white/80" />
      )}
    </button>
  );
}

export default function MediaViewer({
  open,
  items,
  initialIndex = 0,
  onClose,
  onDownloadAll,
  onDownloadError,
  allowDownload = true,
  canDelete = false,
  isDeleting = false,
  onDelete,
}: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentIndex(Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0)));
    setRotationDeg(0);
  }, [open, initialIndex, items.length]);

  const hasItems = items.length > 0;
  const safeIndex = hasItems ? Math.min(currentIndex, items.length - 1) : 0;
  const currentItem = hasItems ? items[safeIndex] : null;
  const currentKind = currentItem ? inferMediaViewerKind(currentItem) : null;
  const canRotate = currentKind === "image";
  const showDelete = Boolean(canDelete && onDelete && currentItem);

  const goPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    setRotationDeg(0);
  }, [items.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    setRotationDeg(0);
  }, [items.length]);

  const handleRotate = useCallback(() => {
    setRotationDeg((prev) => nextClockwiseImageRotationDeg(prev));
  }, []);

  const handleDownloadCurrent = useCallback(async () => {
    if (!currentItem || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadMediaViewerItem(currentItem, safeIndex);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim() !== ""
          ? error.message
          : "No se pudo descargar el archivo.";
      onDownloadError?.(message);
    } finally {
      setIsDownloading(false);
    }
  }, [currentItem, isDownloading, onDownloadError, safeIndex]);

  const handleDownloadAll = useCallback(async () => {
    if (items.length === 0 || isDownloadingAll) return;
    setIsDownloadingAll(true);
    try {
      if (onDownloadAll) {
        await onDownloadAll();
      } else {
        await downloadAllMediaViewerItems(items);
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim() !== ""
          ? error.message
          : "No se pudieron descargar los archivos.";
      onDownloadError?.(message);
    } finally {
      setIsDownloadingAll(false);
    }
  }, [items, isDownloadingAll, onDownloadAll, onDownloadError]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!isDeleting) onClose();
      } else if (event.key === "ArrowLeft") {
        goPrevious();
      } else if (event.key === "ArrowRight") {
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, goPrevious, goNext, isDeleting]);

  const handleOpenChange = (next: boolean) => {
    if (!next && !isDeleting) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/80 supports-backdrop-filter:backdrop-blur-sm"
        className="fixed inset-0 top-0 left-0 z-50 flex h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-black/92 p-0 text-white shadow-none data-ending-style:scale-100 data-starting-style:scale-100"
        data-testid="media-viewer"
      >
        <TooltipProvider>
          <DialogTitle className="sr-only">Visor de archivos</DialogTitle>
          <DialogDescription className="sr-only">
            Vista ampliada con navegación entre archivos
          </DialogDescription>

          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-2 py-3 sm:px-4">
            <p className="min-w-0 flex-1 truncate pr-2 text-sm text-white/70">
              {currentItem
                ? `${getMediaViewerDisplayName(currentItem, safeIndex)} (${safeIndex + 1}/${items.length})`
                : ""}
            </p>

            <div className="flex shrink-0 items-center gap-1">
              {canRotate ? (
                <ToolbarIconButton label="Rotar" onClick={handleRotate}>
                  <RotateCw />
                </ToolbarIconButton>
              ) : null}
              {allowDownload && items.length > 1 ? (
                <ToolbarIconButton
                  label="Descargar todos"
                  disabled={isDownloadingAll || isDeleting}
                  onClick={() => void handleDownloadAll()}
                >
                  {isDownloadingAll ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <FolderArchive />
                  )}
                </ToolbarIconButton>
              ) : null}
              {allowDownload ? (
                <ToolbarIconButton
                  label="Descargar"
                  disabled={!currentItem || isDownloading || isDeleting}
                  onClick={() => void handleDownloadCurrent()}
                >
                  {isDownloading ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Download />
                  )}
                </ToolbarIconButton>
              ) : null}
              {showDelete ? (
                <ToolbarIconButton
                  label="Eliminar"
                  disabled={isDeleting}
                  onClick={() => {
                    if (currentItem) onDelete?.(currentItem);
                  }}
                >
                  {isDeleting ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                </ToolbarIconButton>
              ) : null}
              <ToolbarIconButton
                label="Cerrar"
                disabled={isDeleting}
                onClick={onClose}
              >
                <XIcon />
              </ToolbarIconButton>
            </div>
          </div>

          <div
            className={cn(
              "relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-2 pt-16 sm:px-12",
              items.length > 1 ? "pb-28" : "pb-6",
            )}
          >
            {items.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Archivo anterior"
                className="absolute left-1 top-1/2 z-10 -translate-y-1/2 bg-black/35 text-white hover:bg-black/55 hover:text-white sm:left-4"
                onClick={goPrevious}
              >
                <ChevronLeft />
              </Button>
            ) : null}

            {currentItem ? (
              <MediaViewerMainContent
                item={currentItem}
                index={safeIndex}
                rotationDeg={rotationDeg}
              />
            ) : null}

            {currentItem?.description?.trim() ? (
              <p className="max-w-3xl px-4 text-center text-sm text-white/90">
                {currentItem.description.trim()}
              </p>
            ) : null}

            {items.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Archivo siguiente"
                className="absolute right-1 top-1/2 z-10 -translate-y-1/2 bg-black/35 text-white hover:bg-black/55 hover:text-white sm:right-4"
                onClick={goNext}
              >
                <ChevronRight />
              </Button>
            ) : null}
          </div>

          {items.length > 1 ? (
            <div className="absolute inset-x-0 bottom-0 z-20 overflow-x-auto bg-black/50 px-4 py-3">
              <div className="flex min-w-min gap-2 pb-0.5">
                {items.map((item, index) => (
                  <MediaViewerThumbnail
                    key={item.id}
                    item={item}
                    index={index}
                    selected={index === safeIndex}
                    onSelect={() => {
                      setCurrentIndex(index);
                      setRotationDeg(0);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
