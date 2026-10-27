import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterChipProps {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  testId?: string;
}

export default function FilterChip({
  pressed,
  onClick,
  children,
  className,
  testId,
}: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
        className ??
          (pressed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground"),
      )}
    >
      {children}
    </button>
  );
}
