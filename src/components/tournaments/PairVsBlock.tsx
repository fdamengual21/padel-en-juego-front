import { cn } from "@/lib/utils";

function splitPairNames(label: string): [string, string] {
  const parts = label.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  if (parts.length === 1) return [parts[0], ""];
  return ["Por definir", ""];
}

interface PairVsBlockProps {
  pairALabel: string;
  pairBLabel: string;
  pairAId?: string | null;
  pairBId?: string | null;
  /** Si hay ganador, ese lado queda en negrita con una marca; el otro se atenúa. */
  winnerSide?: "A" | "B" | null;
  /** Abre el detalle de la pareja (el mismo de Participantes). */
  onOpenPair?: (pairId: string) => void;
  className?: string;
}

function pairSideClass(side: "A" | "B", winnerSide?: "A" | "B" | null): string {
  const base = "min-w-0 max-w-[40vw] leading-tight sm:max-w-56";
  if (!winnerSide) return cn(base, "font-bold text-foreground");
  if (side === winnerSide) {
    return cn(base, "border-l-2 border-primary-strong pl-1.5 font-bold text-foreground");
  }
  return cn(base, "font-normal text-muted-foreground");
}

/**
 * Columnas adaptativas (auto) con contenido siempre a la izquierda;
 * el bloque queda centrado y el VS equidistante.
 */
function PairSide({
  side,
  pairId,
  names,
  winnerSide,
  onOpenPair,
}: {
  side: "A" | "B";
  pairId?: string | null;
  names: [string, string];
  winnerSide: "A" | "B" | null;
  onOpenPair?: (pairId: string) => void;
}) {
  const [first, second] = names;
  const content = (
    <>
      <p className="truncate capitalize">{first}</p>
      {second ? <p className="truncate capitalize">{second}</p> : null}
    </>
  );
  if (!onOpenPair || !pairId) {
    return <div className={pairSideClass(side, winnerSide)}>{content}</div>;
  }
  return (
    <button
      type="button"
      className={cn(
        pairSideClass(side, winnerSide),
        "cursor-pointer rounded-sm text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      onClick={(event) => {
        event.stopPropagation();
        onOpenPair(pairId);
      }}
    >
      {content}
    </button>
  );
}

export default function PairVsBlock({
  pairALabel,
  pairBLabel,
  pairAId = null,
  pairBId = null,
  winnerSide = null,
  onOpenPair,
  className,
}: PairVsBlockProps) {
  const namesA = splitPairNames(pairALabel);
  const namesB = splitPairNames(pairBLabel);

  return (
    <div className={cn("flex w-full justify-start", className)}>
      <div className="inline-grid max-w-full grid-cols-[auto_auto_auto] items-center gap-x-2 text-left">
        <PairSide
          side="A"
          pairId={pairAId}
          names={namesA}
          winnerSide={winnerSide}
          onOpenPair={onOpenPair}
        />
        <span className="shrink-0 self-center px-1 text-center text-xs font-semibold uppercase tracking-wide text-sidebar">
          VS
        </span>
        <PairSide
          side="B"
          pairId={pairBId}
          names={namesB}
          winnerSide={winnerSide}
          onOpenPair={onOpenPair}
        />
      </div>
    </div>
  );
}
