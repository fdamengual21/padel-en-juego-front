import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageEditOverlayProps {
  variant?: "fill" | "badge";
  size?: "sm" | "md";
  /** En el visor se muestra en touch; en el header solo al hover. */
  persistOnTouch?: boolean;
  className?: string;
}

export default function ImageEditOverlay({
  variant = "fill",
  size = "md",
  persistOnTouch = true,
  className,
}: ImageEditOverlayProps) {
  const reveal = cn(
    "pointer-events-none transition-opacity",
    persistOnTouch
      ? "opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
      : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
  );

  if (variant === "badge") {
    return (
      <span
        className={cn(
          reveal,
          "absolute right-3 top-3 z-10",
          className,
        )}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
          <Pencil className="size-4" />
          Editar
        </span>
      </span>
    );
  }

  const isSm = size === "sm";

  return (
    <span
      className={cn(
        reveal,
        "absolute inset-0 flex items-center justify-center",
        "bg-black/40 [@media(hover:hover)]:bg-transparent [@media(hover:hover)]:group-hover:bg-black/40",
        className,
      )}
    >
      {isSm ? (
        <span className="flex flex-col items-center gap-0.5 text-white">
          <Pencil className="size-4" />
          <span className="text-[10px] font-semibold leading-none">Editar</span>
        </span>
      ) : (
        <span className="flex flex-col items-center gap-1.5">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Pencil className="size-5" />
          </span>
          <span className="text-sm font-semibold text-white">Editar</span>
        </span>
      )}
    </span>
  );
}
