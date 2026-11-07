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
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        className ??
          (pressed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground hover:border-foreground/25 hover:bg-muted"),
      )}
    >
      {children}
    </button>
  );
}

/** Toggle multi-select: si quedan todos seleccionados, vuelve a vacío (= sin filtro). */
export function toggleFilterValue<T extends string | number>(
  selected: T[],
  value: T,
  allCount: number,
): T[] {
  const next = selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
  if (typeof value === "number") {
    (next as number[]).sort((a, b) => a - b);
  }
  if (next.length === allCount) return [];
  return next;
}
