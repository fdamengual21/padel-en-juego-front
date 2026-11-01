import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneChipClass, toneThumbClass, type CompetitionResultView } from "./competitionResult";

export interface CompetitionMetaItem {
  icon: LucideIcon;
  text: string;
}

interface CompetitionCardProps {
  title: string;
  imageUrl: string | null;
  result: CompetitionResultView;
  meta: CompetitionMetaItem[];
  /** Línea grande bajo "Resultado final": partidos ganados - perdidos o puesto. */
  outcome: ReactNode;
  points: number | null;
  /** Fecha dentro de la card de su circuito: más compacta. */
  nested?: boolean;
  open: boolean;
  onToggle: () => void;
  testId: string;
  children: ReactNode;
}

export default function CompetitionCard({
  title,
  imageUrl,
  result,
  meta,
  outcome,
  points,
  nested = false,
  open,
  onToggle,
  testId,
  children,
}: CompetitionCardProps) {
  const [failed, setFailed] = useState(false);
  const photo = failed ? null : imageUrl;
  const ResultIcon = result.icon;

  return (
    <div
      className={cn(
        "overflow-hidden border border-border shadow-sm transition-colors hover:border-foreground/20",
        nested ? "rounded-xl bg-background" : "rounded-2xl bg-card",
      )}
      data-testid={testId}
    >
      <button
        type="button"
        className={cn(
          "flex w-full cursor-pointer flex-col gap-3 text-left md:flex-row md:items-center md:justify-between md:gap-4",
          nested ? "p-3" : "p-4 sm:p-5",
        )}
        aria-expanded={open}
        onClick={onToggle}
      >
        <div className="flex min-w-0 items-start gap-4 sm:items-center">
          <div
            className={cn(
              "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border",
              photo ? "border-border bg-muted" : toneThumbClass[result.tone],
            )}
          >
            {photo ? (
              <img
                src={photo}
                alt=""
                className="absolute inset-0 size-full object-cover"
                onError={() => setFailed(true)}
              />
            ) : (
              <ResultIcon className="size-6" aria-hidden />
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h4 className="min-w-0 truncate text-base font-extrabold tracking-tight text-foreground">
                {title}
              </h4>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide",
                  toneChipClass[result.tone],
                )}
              >
                <ResultIcon className="size-3.5" aria-hidden />
                {result.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {meta.map((item) => {
                const Icon = item.icon;
                return (
                  <span key={item.text} className="inline-flex items-center gap-1">
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                    {item.text}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-6 border-t border-border pt-3 md:justify-end md:border-t-0 md:pt-0">
          <div className="text-left md:text-right">
            <p className="text-xs font-bold uppercase text-muted-foreground">Resultado final</p>
            <div className="flex items-center gap-2 md:justify-end">
              {outcome}
              {points !== null ? (
                <span className="rounded-md bg-primary/25 px-1.5 py-0.5 text-xs font-bold text-primary-strong tabular-nums">
                  +{points} pts
                </span>
              ) : null}
            </div>
          </div>
          <span className="rounded-xl bg-muted p-1.5 text-muted-foreground">
            <ChevronDown
              className={cn("size-5 transition-transform duration-200", open && "rotate-180")}
              aria-hidden
            />
          </span>
        </div>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-border bg-muted/40 p-4">{children}</div>
      ) : null}
    </div>
  );
}
