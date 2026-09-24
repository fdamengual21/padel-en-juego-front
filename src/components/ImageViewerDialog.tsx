import { useEffect, useState } from "react";
import { LoaderCircle, XIcon } from "lucide-react";
import { initialsFromName } from "@/components/Avatar";
import ImagePickerField from "@/components/ImagePickerField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  onSave?: (file: File) => void | Promise<unknown>;
  onDelete?: () => void | Promise<unknown>;
}

function SavingOverlay() {
  return (
    <span className="absolute inset-0 flex items-center justify-center bg-black/50">
      <LoaderCircle className="size-8 animate-spin text-white" />
      <span className="sr-only">Guardando</span>
    </span>
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

  const handleFileSelect = (file: File) => {
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
            <ImagePickerField
              canEdit={canEdit}
              disabled={isSaving}
              ariaLabel={changeLabel}
              frameClassName="size-[min(85vw,22rem)] overflow-hidden rounded-full bg-muted"
              testId="profile-image-edit"
              onFileSelect={handleFileSelect}
            >
              {avatarMedia}
              {isSaving ? <SavingOverlay /> : null}
            </ImagePickerField>
          </div>
        ) : (
          <div className="relative flex min-h-48 items-center justify-center bg-black px-3 py-3 sm:px-4 sm:py-4">
            <ImagePickerField
              canEdit={canEdit}
              disabled={isSaving}
              ariaLabel={changeLabel}
              frameClassName="inline-flex max-h-[min(82vh,44rem)] max-w-full items-center justify-center"
              testId="profile-image-edit"
              onFileSelect={handleFileSelect}
            >
              {coverMedia}
              {isSaving ? <SavingOverlay /> : null}
            </ImagePickerField>
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
      </DialogContent>
    </Dialog>
  );
}
