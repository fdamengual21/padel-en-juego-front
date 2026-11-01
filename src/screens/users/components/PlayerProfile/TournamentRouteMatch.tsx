import type { ReactNode } from "react";
import Avatar from "@/components/Avatar";
import { canOpenMatchResult, type MatchPhase, type PlayerMatchView, type SetScore } from "@/domain";
import { toTitleCase } from "@/lib/text";
import { cn } from "@/lib/utils";

interface TournamentRouteMatchProps {
  item: PlayerMatchView;
  /** Pareja del jugador del perfil: va primero y define ganado / perdido. */
  pairId: string;
  onOpenResult: (item: PlayerMatchView) => void;
  onOpenPair: (item: PlayerMatchView, pairId: string) => void;
}

const phaseShort: Record<MatchPhase, string> = {
  GROUP: "Zona",
  PLAY_IN: "Repechaje",
  R32: "16avos",
  R16: "Octavos",
  QF: "Cuartos",
  SF: "Semis",
  FINAL: "Final",
  CONSOLATION: "Consuelo",
};

const pendingLabel: Record<string, string> = {
  scheduled: "Por jugar",
  inProgress: "En juego",
  cancelled: "Cancelado",
};

export default function TournamentRouteMatch({
  item,
  pairId,
  onOpenResult,
  onOpenPair,
}: TournamentRouteMatchProps) {
  const { match } = item;
  const mineIsA = match.pairAId === pairId;
  const mine = mineIsA
    ? { id: match.pairAId, names: item.pairANames, avatars: item.pairAAvatars }
    : { id: match.pairBId, names: item.pairBNames, avatars: item.pairBAvatars };
  const rival = mineIsA
    ? { id: match.pairBId, names: item.pairBNames, avatars: item.pairBAvatars }
    : { id: match.pairAId, names: item.pairANames, avatars: item.pairAAvatars };
  const outcome = !match.winnerPairId ? "pending" : match.winnerPairId === pairId ? "won" : "lost";
  const score =
    match.status === "walkover"
      ? "W.O."
      : match.sets.length > 0
        ? scoreLine(match.sets, mineIsA)
        : "—";
  const canOpen = canOpenMatchResult(match, true);

  const result = (
    <>
      <span
        className={cn(
          "font-extrabold tabular-nums",
          outcome === "won" && "text-success",
          outcome === "lost" && "text-destructive",
          outcome === "pending" && "text-muted-foreground",
        )}
      >
        {score}
      </span>
      <span
        className={cn(
          "rounded px-2 py-0.5 text-[11px] font-semibold",
          outcome === "won" && "bg-success/10 text-success",
          outcome === "lost" && "bg-destructive/10 text-destructive",
          outcome === "pending" && "bg-muted text-muted-foreground",
        )}
      >
        {outcome === "won" ? "Ganado" : outcome === "lost" ? "Perdido" : (pendingLabel[match.status] ?? "Por jugar")}
      </span>
    </>
  );
  const resultClass = "flex shrink-0 flex-col items-end gap-1 md:flex-row md:items-center md:gap-2";

  return (
    <article
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-xs sm:text-sm"
      data-testid={`route-match-${match.id}`}
    >
      <span
        className={cn(
          "w-16 shrink-0 self-start text-[11px] leading-5 font-bold uppercase tracking-wide md:self-center",
          match.phase === "FINAL" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
        )}
      >
        {phaseShort[match.phase] ?? item.phaseLabel}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-2">
        <PairLine
          names={mine.names}
          avatars={mine.avatars}
          emphasis
          onOpen={mine.id ? () => onOpenPair(item, mine.id!) : undefined}
        />
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-muted-foreground">vs.</span>
          <PairLine
            names={rival.names}
            avatars={rival.avatars}
            onOpen={rival.id ? () => onOpenPair(item, rival.id!) : undefined}
          />
        </div>
      </div>

      {canOpen ? (
        <button
          type="button"
          aria-label="Ver resultado"
          className={cn(resultClass, "cursor-pointer rounded-md p-1 hover:bg-muted/60")}
          onClick={() => onOpenResult(item)}
        >
          {result}
        </button>
      ) : (
        <div className={resultClass}>{result}</div>
      )}
    </article>
  );
}

function PairLine({
  names,
  avatars,
  emphasis = false,
  onOpen,
}: {
  names: [string, string];
  avatars: [string | null, string | null];
  emphasis?: boolean;
  onOpen?: () => void;
}) {
  const people = names.map(toTitleCase).filter(Boolean);
  const content: ReactNode = (
    <>
      <span className="flex shrink-0 -space-x-1.5">
        {people.map((name, index) => (
          <Avatar
            key={`${name}-${index}`}
            name={name}
            imageUrl={avatars[index]}
            size="xs"
            className="size-5 text-[8px] ring-2 ring-card"
          />
        ))}
      </span>
      <span className={cn("min-w-0 truncate", emphasis ? "font-semibold text-foreground" : "font-medium text-foreground/90")}>
        {people.length > 0 ? people.join(" / ") : "Por definir"}
      </span>
    </>
  );

  if (!onOpen) return <span className="flex min-w-0 items-center gap-1.5">{content}</span>;
  return (
    <button
      type="button"
      className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md text-left hover:underline"
      onClick={onOpen}
    >
      {content}
    </button>
  );
}

function scoreLine(sets: SetScore[], mineIsA: boolean): string {
  return sets
    .map((set) => {
      const mine = mineIsA ? set.gamesA : set.gamesB;
      const theirs = mineIsA ? set.gamesB : set.gamesA;
      const tiebreak =
        set.tiebreakA != null && set.tiebreakB != null
          ? `(${Math.min(set.tiebreakA, set.tiebreakB)})`
          : "";
      return `${mine}-${theirs}${tiebreak}`;
    })
    .join(" / ");
}
