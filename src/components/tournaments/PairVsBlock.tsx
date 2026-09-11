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
 * Tres columnas iguales: pareja A | VS | pareja B (alineado a la izquierda).
 */
export default function PairVsBlock({
  pairALabel,
  pairBLabel,
  className,
}: PairVsBlockProps) {
  const [a1, a2] = splitPairNames(pairALabel);
  const [b1, b2] = splitPairNames(pairBLabel);

  return (
    <div
      className={cn(
        "grid w-full grid-cols-3 items-center gap-x-1 text-left",
        className,
      )}
    >
      <div className="min-w-0 font-bold leading-tight">
        <p className="truncate">{a1}</p>
        {a2 ? <p className="truncate">{a2}</p> : null}
      </div>
      <span className="self-center text-left text-[10px] font-semibold uppercase tracking-wide text-primary">
        VS
      </span>
      <div className="min-w-0 font-bold leading-tight">
        <p className="truncate">{b1}</p>
        {b2 ? <p className="truncate">{b2}</p> : null}
      </div>
    </div>
  );
}
