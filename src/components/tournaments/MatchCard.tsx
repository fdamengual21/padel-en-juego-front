import type { Match } from "@/domain";
import ParticipantPairLine from "@/components/tournaments/ParticipantPairLine";
import Score from "@/components/tournaments/Score";
import StatusBadge from "@/components/tournaments/StatusBadge";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  match: Match;
  pairALabel: string;
  pairBLabel: string;
  pairANames?: [string, string];
  pairBNames?: [string, string];
  pairAAvatars?: [string | null, string | null];
  pairBAvatars?: [string | null, string | null];
  courtLabel?: string | null;
  phaseLabel?: string;
  onOpenResult?: () => void;
  onOpenPair?: (side: "A" | "B") => void;
}

function namesFromLabel(label: string, explicit?: [string, string]): [string, string] {
  if (explicit && (explicit[0] || explicit[1])) return explicit;
  const parts = label.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  if (parts.length === 1) return [parts[0], ""];
  return ["Por definir", ""];
}

export default function MatchCard({
  match,
  pairALabel,
  pairBLabel,
  pairANames,
  pairBNames,
  pairAAvatars = [null, null],
  pairBAvatars = [null, null],
  courtLabel,
  phaseLabel,
  onOpenResult,
  onOpenPair,
}: MatchCardProps) {
  const namesA = namesFromLabel(pairALabel, pairANames);
  const namesB = namesFromLabel(pairBLabel, pairBNames);
  const winnerSide =
    match.winnerPairId && match.winnerPairId === match.pairAId
      ? "A"
      : match.winnerPairId && match.winnerPairId === match.pairBId
        ? "B"
        : null;
  const muteA = winnerSide === "B";
  const muteB = winnerSide !== "B";
  const sets = match.sets.map((set) => ({ gamesA: set.gamesA, gamesB: set.gamesB }));

  return (
    <article
      data-testid={`match-card-${match.id}`}
      className="rounded-xl border border-border bg-card px-4 py-3 text-left"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {phaseLabel ?? match.phase}
          {match.scheduledAt ? ` · ${new Date(match.scheduledAt).toLocaleString("es-AR")}` : ""}
        </p>
        <StatusBadge status={match.status} />
      </div>
      {courtLabel ? <p className="mb-2 text-xs text-muted-foreground">{courtLabel}</p> : null}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <PairHit
            names={namesA}
            avatars={pairAAvatars}
            muted={muteA}
            onOpen={onOpenPair && match.pairAId ? () => onOpenPair("A") : undefined}
          />
          {onOpenResult ? (
            <button
              type="button"
              aria-label="Ver resultado"
              className="shrink-0 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onOpenResult}
            >
              <Score sets={sets} />
            </button>
          ) : (
            <Score sets={sets} />
          )}
        </div>
        <PairHit
          names={namesB}
          avatars={pairBAvatars}
          muted={muteB}
          onOpen={onOpenPair && match.pairBId ? () => onOpenPair("B") : undefined}
        />
      </div>
    </article>
  );
}

function PairHit({
  names,
  avatars,
  muted,
  onOpen,
}: {
  names: [string, string];
  avatars: [string | null, string | null];
  muted: boolean;
  onOpen?: () => void;
}) {
  const line = (
    <ParticipantPairLine names={names} avatars={avatars} size="xs" muted={muted} />
  );
  if (!onOpen) return line;
  return (
    <button
      type="button"
      className={cn(
        "min-w-0 flex-1 rounded-md px-1 py-0.5 text-left transition-colors",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      onClick={onOpen}
    >
      {line}
    </button>
  );
}
