import type { SetScore } from "@/domain";
import { parseIntegerFromForm } from "@/lib/latamNumberInput";
import { cn } from "@/lib/utils";

interface MatchScoreboardProps {
  pairANames: [string, string];
  pairBNames: [string, string];
  sets: SetScore[];
  /** Columnas visibles (sets + tie-break decisivo si aplica). */
  slotCount: number;
  /** Índice de la columna decisiva de tie-break (estilo distinto). */
  decidingSlotIndex?: number | null;
  editable?: boolean;
  onChange?: (index: number, side: "A" | "B", value: string) => void;
  /** `sm` = filas de zona; `md` = modal de carga. */
  size?: "sm" | "md";
  className?: string;
}

function cellValue(sets: SetScore[], index: number, side: "A" | "B"): number {
  const set = sets[index];
  if (!set) return 0;
  return side === "A" ? set.gamesA : set.gamesB;
}

/**
 * Marcador compacto: nombres a la izquierda, columnas de set a la derecha.
 * Misma estructura que un scoreboard TV, sin tamaño ni colores de broadcast.
 */
export default function MatchScoreboard({
  pairANames,
  pairBNames,
  sets,
  slotCount,
  decidingSlotIndex = null,
  editable = false,
  onChange,
  size = "sm",
  className,
}: MatchScoreboardProps) {
  const slots = Math.max(1, slotCount);
  const isMd = size === "md";

  return (
    <div
      className={cn(
        "inline-grid w-full max-w-md overflow-hidden rounded-md border border-border bg-card text-card-foreground",
        className,
      )}
      data-testid="match-scoreboard"
    >
      <ScoreboardRow
        names={pairANames}
        sets={sets}
        side="A"
        slotCount={slots}
        decidingSlotIndex={decidingSlotIndex}
        editable={editable}
        onChange={onChange}
        isMd={isMd}
        showDivider
      />
      <ScoreboardRow
        names={pairBNames}
        sets={sets}
        side="B"
        slotCount={slots}
        decidingSlotIndex={decidingSlotIndex}
        editable={editable}
        onChange={onChange}
        isMd={isMd}
      />
    </div>
  );
}

function ScoreboardRow({
  names,
  sets,
  side,
  slotCount,
  decidingSlotIndex,
  editable,
  onChange,
  isMd,
  showDivider = false,
}: {
  names: [string, string];
  sets: SetScore[];
  side: "A" | "B";
  slotCount: number;
  decidingSlotIndex: number | null;
  editable: boolean;
  onChange?: (index: number, side: "A" | "B", value: string) => void;
  isMd: boolean;
  showDivider?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto]",
        showDivider && "border-b border-border",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col justify-center bg-muted/50",
          isMd ? "gap-0.5 px-2.5 py-1.5" : "gap-px px-2 py-1",
        )}
      >
        {names.map((name, i) => (
          <p
            key={`${side}-${i}-${name}`}
            className={cn(
              "truncate font-medium leading-tight text-foreground",
              isMd ? "text-xs" : "text-[11px]",
            )}
          >
            {name || "—"}
          </p>
        ))}
      </div>
      <div className="flex">
        {Array.from({ length: slotCount }, (_, index) => {
          const isDeciding =
            decidingSlotIndex != null && index === decidingSlotIndex;
          const value = cellValue(sets, index, side);
          return (
            <label
              key={index}
              className={cn(
                "flex items-center justify-center border-l border-border",
                isMd ? "w-9" : "w-7",
                isDeciding ? "bg-background" : "bg-primary/15",
              )}
              title={isDeciding && slotCount > 1 ? "Tie-break" : `Set ${index + 1}`}
            >
              <span className="sr-only">
                {isDeciding ? "Tie-break" : `Set ${index + 1}`} pareja {side}
              </span>
              {editable && onChange ? (
                <ScoreCellInput
                  value={value}
                  showZero={
                    cellValue(sets, index, "A") > 0 ||
                    cellValue(sets, index, "B") > 0
                  }
                  isMd={isMd}
                  onChange={(next) => onChange(index, side, next)}
                />
              ) : (
                <span
                  className={cn(
                    "font-semibold tabular-nums text-foreground",
                    isMd ? "text-sm py-1.5" : "text-xs py-1",
                  )}
                >
                  {value}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Input de games: vacío si es 0 y el set aún no se cargó (como cash entries). */
function ScoreCellInput({
  value,
  showZero,
  isMd,
  onChange,
}: {
  value: number;
  showZero: boolean;
  isMd: boolean;
  onChange: (value: string) => void;
}) {
  // Vacío al empezar; si el set ya tiene marcador, el 0 se muestra (ej. 6-0).
  const display = value === 0 && !showZero ? "" : String(value);

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={cn(
        "w-full bg-transparent text-center font-semibold tabular-nums text-foreground outline-none",
        isMd ? "text-sm py-1.5" : "text-xs py-1",
      )}
      value={display}
      onChange={(e) => {
        onChange(
          String(parseIntegerFromForm(e.target.value, { max: 99, maxDigits: 2 })),
        );
      }}
      onKeyDown={(e) => {
        if (e.key === "." || e.key === ",") e.preventDefault();
      }}
      onFocus={(e) => e.target.select()}
    />
  );
}
