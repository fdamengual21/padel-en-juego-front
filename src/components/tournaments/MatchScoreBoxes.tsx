import type { SetScore } from "@core-api";
import { cn } from "@/lib/utils";

interface MatchScoreBoxesProps {
  sets: SetScore[];
  /** Columnas visibles (sets + tie-break decisivo si aplica). */
  slotCount: number;
  decidingSlotIndex?: number | null;
  size?: "sm" | "md";
  className?: string;
}

function cellValue(sets: SetScore[], index: number, side: "A" | "B"): number {
  const set = sets[index];
  if (!set) return 0;
  return side === "A" ? set.gamesA : set.gamesB;
}

/** Solo los cuadrados del marcador (2 filas × N sets), sin nombres. */
export default function MatchScoreBoxes({
  sets,
  slotCount,
  decidingSlotIndex = null,
  size = "sm",
  className,
}: MatchScoreBoxesProps) {
  const slots = Math.max(1, slotCount);
  const large = size === "md";

  return (
    <div
      className={cn(
        "inline-grid overflow-hidden rounded border border-border",
        className,
      )}
      data-testid="match-score-boxes"
    >
      {(["A", "B"] as const).map((side, rowIndex) => (
        <div
          key={side}
          className={cn("flex", rowIndex === 0 && "border-b border-border")}
        >
          {Array.from({ length: slots }, (_, index) => {
            const isDeciding =
              decidingSlotIndex != null && index === decidingSlotIndex;
            return (
              <span
                key={index}
                className={cn(
                  "flex items-center justify-center font-semibold tabular-nums",
                  large ? "h-8 w-8 text-sm" : "h-5 w-5 text-[11px]",
                  index > 0 && "border-l border-border",
                  isDeciding ? "bg-background" : "bg-primary/15",
                )}
                title={isDeciding && slots > 1 ? "Tie-break" : `Set ${index + 1}`}
              >
                {cellValue(sets, index, side)}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
