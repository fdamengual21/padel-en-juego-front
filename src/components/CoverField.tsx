import { useState } from "react";
import ImageEditOverlay from "@/components/ImageEditOverlay";
import ImageViewerDialog from "@/components/ImageViewerDialog";
import { cn } from "@/lib/utils";

interface CoverFieldProps {
  imageUrl?: string | null;
  fallbackName?: string;
  canEdit?: boolean;
  isSaving?: boolean;
  title?: string;
  ariaLabel?: string;
  editAriaLabel?: string;
  onSave?: (file: File) => void | Promise<unknown>;
  onDelete?: () => void | Promise<unknown>;
  testId?: string;
  className?: string;
}

export default function CoverField({
  imageUrl,
  fallbackName = "",
  canEdit = false,
  isSaving = false,
  title = "Portada",
  ariaLabel,
  editAriaLabel,
  onSave,
  onDelete,
  testId,
  className,
}: CoverFieldProps) {
  const [open, setOpen] = useState(false);
  const canMutate = canEdit && Boolean(onSave);
  const openLabel = ariaLabel ?? (canMutate ? "Editar portada" : "Ver portada");

  return (
    <>
      <button
        type="button"
        className={cn("group absolute inset-0 z-0 cursor-pointer", className)}
        aria-label={openLabel}
        data-testid={testId}
        onClick={() => setOpen(true)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/20" />
        {canMutate ? (
          <ImageEditOverlay variant="badge" persistOnTouch={false} />
        ) : null}
      </button>
      <ImageViewerDialog
        open={open}
        onOpenChange={setOpen}
        mode="cover"
        title={title}
        imageUrl={imageUrl ?? null}
        fallbackName={fallbackName}
        canEdit={canMutate}
        isSaving={isSaving}
        editAriaLabel={editAriaLabel}
        onSave={onSave}
        onDelete={onDelete}
      />
    </>
  );
}
