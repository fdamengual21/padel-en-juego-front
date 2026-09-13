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
  className?: string;
}

/**
 * Columnas adaptativas (auto) con contenido siempre a la izquierda;
 * el bloque queda centrado y el VS equidistante.
 */
export default function PairVsBlock({
  pairALabel,
  pairBLabel,
  className,
}: PairVsBlockProps) {
  const [a1, a2] = splitPairNames(pairALabel);
  const [b1, b2] = splitPairNames(pairBLabel);

  return (
    <div className={cn("flex w-full justify-start", className)}>
      <div className="inline-grid max-w-full grid-cols-[auto_auto_auto] items-center gap-x-2 text-left">
        <div className="min-w-0 max-w-[40vw] font-bold leading-tight sm:max-w-56">
          <p className="truncate">{a1}</p>
          {a2 ? <p className="truncate">{a2}</p> : null}
        </div>
        <span className="shrink-0 self-center px-1 text-center text-[10px] font-semibold uppercase tracking-wide text-sidebar">
          VS
        </span>
        <div className="min-w-0 max-w-[40vw] font-bold leading-tight sm:max-w-56">
          <p className="truncate">{b1}</p>
          {b2 ? <p className="truncate">{b2}</p> : null}
        </div>
      </div>
    </div>
  );
}
