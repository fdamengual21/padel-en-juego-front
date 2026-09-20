import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { LoaderCircle, Pencil, XIcon } from "lucide-react";
import { initialsFromName } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export type ImageViewerMode = "avatar" | "cover";

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ImageViewerMode;
  title: string;
  imageUrl: string | null;
  fallbackName: string;
  canEdit?: boolean;
  isSaving?: boolean;
  editAriaLabel?: string;
  onSave?: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function isAllowedImage(file: File): boolean {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return true;
  if (!file.type) {
    return /\.(jpe?g|png|webp|gif)$/i.test(file.name);
  }
  return false;
}

function validateImageFile(file: File): string | null {
  if (!isAllowedImage(file)) {
    return "Formato no permitido. Usá JPG, PNG, WEBP o GIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "La imagen no puede superar 5 MB.";
  }
  return null;
}

function EditHoverOverlay() {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity",
        "opacity-100 [@media(hover:hover)]:bg-transparent [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:bg-black/40 [@media(hover:hover)]:group-hover:opacity-100",
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <Pencil className="size-5" />
      </span>
    </span>
  );
}

function SavingOverlay() {
  return (
    <span className="absolute inset-0 flex items-center justify-center bg-black/50">
      <LoaderCircle className="size-8 animate-spin text-white" />
      <span className="sr-only">Guardando</span>
    </span>
  );
}

function InteractiveFrame({
  canEdit,
  isSaving,
  ariaLabel,
  className,
  onEdit,
  children,
}: {
  canEdit: boolean;
  isSaving: boolean;
  ariaLabel: string;
  className: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  if (!canEdit) {
    return <div className={className}>{children}</div>;
  }

  return (
    <button
      type="button"
      className={cn("group", className, isSaving ? "cursor-wait" : "cursor-pointer")}
      disabled={isSaving}
      aria-label={ariaLabel}
      data-testid="profile-image-edit"
      onClick={onEdit}
    >
      {children}
      {isSaving ? <SavingOverlay /> : <EditHoverOverlay />}
    </button>
  );
}

export default function ImageViewerDialog({
  open,
  onOpenChange,
  mode,
  title,
  imageUrl,
  fallbackName,
  canEdit = false,
  isSaving = false,
  editAriaLabel,
  onSave,
  onDelete,
}: ImageViewerDialogProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const displayedUrl = previewUrl ?? imageUrl;
  const isAvatar = mode === "avatar";
  const changeLabel =
    editAriaLabel ?? (isAvatar ? "Cambiar foto de perfil" : "Cambiar portada");

  useEffect(() => {
    if (open) return;
    setPendingFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleOpenChange = (next: boolean) => {
    if (isSaving) return;
    onOpenChange(next);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      toastError("No se pudo usar la imagen", error);
      return;
    }

    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!pendingFile || isSaving || !onSave) return;
    try {
      await onSave(pendingFile);
    } catch {
      return;
    }
    setPendingFile(null);
    setPreviewUrl(null);
  };

  const handleDelete = async () => {
    if (!onDelete || isSaving || pendingFile) return;
    try {
      await onDelete();
    } catch {
      return;
    }
  };

  const openFilePicker = () => {
    if (!canEdit || isSaving) return;
    fileInputRef.current?.click();
  };

  const avatarMedia = displayedUrl ? (
    <img src={displayedUrl} alt={title} className="size-full object-cover" />
  ) : (
    <span className="flex size-full items-center justify-center text-5xl font-semibold text-muted-foreground">
      {initialsFromName(fallbackName)}
    </span>
  );

  const coverMedia = displayedUrl ? (
    <img
      src={displayedUrl}
      alt={title}
      className="max-h-[min(82vh,44rem)] max-w-full object-contain"
    />
  ) : (
    <span className="flex min-h-48 w-full max-w-3xl items-center justify-center px-6 py-16 text-sm text-muted-foreground">
      Sin portada
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/80 supports-backdrop-filter:backdrop-blur-sm"
        className={cn(
          "gap-0 overflow-hidden border-0 bg-black p-0 text-white shadow-none",
          isAvatar ? "max-w-lg" : "max-w-[min(96vw,64rem)]",
        )}
        data-testid="profile-image-viewer"
        data-mode={mode}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="min-w-0 flex-1 pr-2">
            <DialogTitle className="truncate text-white">{title}</DialogTitle>
            <DialogDescription className="sr-only">
              {isAvatar
                ? "Vista ampliada de la foto de perfil"
                : "Vista completa de la portada"}
            </DialogDescription>
          </div>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isSaving}
                className="text-white hover:bg-white/15 hover:text-white"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
        </div>

        {isAvatar ? (
          <div className="relative flex min-h-72 items-center justify-center bg-black px-4 py-6">
            <InteractiveFrame
              canEdit={canEdit}
              isSaving={isSaving}
              ariaLabel={changeLabel}
              className="relative size-[min(85vw,22rem)] overflow-hidden rounded-full bg-muted"
              onEdit={openFilePicker}
            >
              {avatarMedia}
            </InteractiveFrame>
          </div>
        ) : (
          <div className="relative flex min-h-48 items-center justify-center bg-black px-3 py-3 sm:px-4 sm:py-4">
            <InteractiveFrame
              canEdit={canEdit}
              isSaving={isSaving}
              ariaLabel={changeLabel}
              className="relative inline-flex max-h-[min(82vh,44rem)] max-w-full items-center justify-center"
              onEdit={openFilePicker}
            >
              {coverMedia}
            </InteractiveFrame>
          </div>
        )}

        {canEdit && pendingFile ? (
          <div className="p-4">
            <Button
              type="button"
              className="w-full"
              disabled={isSaving}
              data-testid="profile-image-save"
              onClick={() => void handleSave()}
            >
              {isSaving ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        ) : null}

        {canEdit && !pendingFile && imageUrl && onDelete ? (
          <div className="p-4">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-white hover:bg-white/15 hover:text-white"
              disabled={isSaving}
              data-testid="profile-image-delete"
              onClick={() => void handleDelete()}
            >
              {isSaving ? "Quitando…" : isAvatar ? "Quitar foto" : "Quitar portada"}
            </Button>
          </div>
        ) : null}

        {canEdit ? (
          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
            className="hidden"
            tabIndex={-1}
            aria-hidden
            disabled={isSaving}
            onChange={handleFileChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
