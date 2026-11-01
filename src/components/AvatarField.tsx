import { useState } from "react";
import Avatar, { type AvatarSize } from "@/components/Avatar";
import ImageEditOverlay from "@/components/ImageEditOverlay";
import ImageViewerDialog from "@/components/ImageViewerDialog";
import { cn } from "@/lib/utils";

interface AvatarFieldProps {
  name: string;
  imageUrl?: string | null;
  alt?: string;
  size?: AvatarSize;
  canEdit?: boolean;
  isSaving?: boolean;
  title?: string;
  ariaLabel?: string;
  editAriaLabel?: string;
  onSave?: (file: File) => void | Promise<unknown>;
  onDelete?: () => void | Promise<unknown>;
  testId?: string;
  /** `rounded`: cuadrada con esquinas redondeadas (perfil del jugador). */
  shape?: "circle" | "rounded";
  className?: string;
  avatarClassName?: string;
}

const shapeClass = { circle: "rounded-full", rounded: "rounded-xl" } as const;

export default function AvatarField({
  name,
  imageUrl,
  alt,
  size = "xl",
  canEdit = false,
  isSaving = false,
  title = "Foto de perfil",
  ariaLabel,
  editAriaLabel,
  onSave,
  onDelete,
  testId,
  shape = "circle",
  className,
  avatarClassName,
}: AvatarFieldProps) {
  const [open, setOpen] = useState(false);
  const canMutate = canEdit && Boolean(onSave);
  const openLabel = ariaLabel ?? (canMutate ? "Editar foto de perfil" : "Ver foto de perfil");

  return (
    <>
      <button
        type="button"
        className={cn(
          "group relative shrink-0 cursor-pointer",
          shapeClass[shape],
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
          className,
        )}
        aria-label={openLabel}
        data-testid={testId}
        onClick={() => setOpen(true)}
      >
        <Avatar
          name={name}
          imageUrl={imageUrl}
          size={size}
          alt={alt ?? name}
          className={cn("pointer-events-none ring-2 ring-white/80", shapeClass[shape], avatarClassName)}
        />
        {canMutate ? (
          <ImageEditOverlay size="sm" persistOnTouch={false} className={shapeClass[shape]} />
        ) : null}
      </button>
      <ImageViewerDialog
        open={open}
        onOpenChange={setOpen}
        mode="avatar"
        title={title}
        imageUrl={imageUrl ?? null}
        fallbackName={name}
        canEdit={canMutate}
        isSaving={isSaving}
        editAriaLabel={editAriaLabel}
        onSave={onSave}
        onDelete={onDelete}
      />
    </>
  );
}
