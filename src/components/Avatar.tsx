import { useEffect, useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-muted-foreground ring-1 ring-border",
  {
    variants: {
      size: {
        xs: "size-7 text-[10px]",
        sm: "size-9 text-xs",
        md: "size-12 text-sm",
        lg: "size-16 text-base",
        xl: "size-20 text-lg",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>["size"]>;

interface AvatarProps extends VariantProps<typeof avatarVariants> {
  /** Nombre completo para iniciales (foto o fallback). */
  name: string;
  /** URL de imagen; si falla o es null, se muestran iniciales. */
  imageUrl?: string | null;
  className?: string;
  alt?: string;
}

/** Iniciales: 1 palabra → 2 letras; varias → primera + última (FA). */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return (parts[0]!.slice(0, 2) || "?").toUpperCase();
  }
  const first = parts[0]![0] ?? "";
  const last = parts[parts.length - 1]![0] ?? "";
  return `${first}${last}`.toUpperCase();
}

/**
 * Avatar reutilizable: imagen si hay URL válida, si no iniciales.
 * Tamaños: xs | sm | md | lg | xl.
 */
export default function Avatar({
  name,
  imageUrl,
  size = "md",
  className,
  alt = "",
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  return (
    <div
      className={cn(avatarVariants({ size }), className)}
      aria-hidden={showImage ? undefined : true}
      data-slot="avatar"
    >
      {showImage ? (
        <img
          src={imageUrl!}
          alt={alt}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initialsFromName(name)}</span>
      )}
    </div>
  );
}
