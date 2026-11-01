import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Building2, Calendar, Flag, Users } from "lucide-react";
import Api from "@/api/Api";
import type { MatchPhase, PlayerMatchView, PublicPlayerTournament } from "@/domain";
import { formatDateRangeShortEs } from "@/lib/dates";
import { ROUTES } from "@/router/routes";
import CompetitionCard, { type CompetitionMetaItem } from "./CompetitionCard";
import CompetitionPanel from "./CompetitionPanel";
import { tournamentResultView } from "./competitionResult";
import TournamentRouteMatch from "./TournamentRouteMatch";

interface PlayerTournamentItemProps {
  userId: string;
  tournament: PublicPlayerTournament;
  /** Fecha dentro de la card de su circuito. */
  nested?: boolean;
  onOpenResult: (item: PlayerMatchView) => void;
  onOpenPair: (item: PlayerMatchView, pairId: string) => void;
}

const stageRank: Record<MatchPhase, number> = {
  GROUP: 0,
  CONSOLATION: 1,
  PLAY_IN: 1,
  R32: 2,
  R16: 3,
  QF: 4,
  SF: 5,
  FINAL: 6,
};

/** La instancia más alta arriba; dentro de la misma, el partido más reciente primero. */
function sortByStage(items: PlayerMatchView[]): PlayerMatchView[] {
  const time = (item: PlayerMatchView) =>
    item.match.scheduledAt ? new Date(item.match.scheduledAt).getTime() : 0;
  return [...items].sort(
    (left, right) =>
      (stageRank[right.match.phase] ?? 0) - (stageRank[left.match.phase] ?? 0) ||
      time(right) - time(left) ||
      right.match.sortOrder - left.match.sortOrder,
  );
}

export default function PlayerTournamentItem({
  userId,
  tournament,
  nested = false,
  onOpenResult,
  onOpenPair,
}: PlayerTournamentItemProps) {
  const [open, setOpen] = useState(false);
  const matches = useQuery({
    queryKey: ["public-player-pair-matches", userId, tournament.pairId],
    queryFn: () =>
      Api.TournamentOpsService().getPublicPlayerPairMatches(userId, tournament.pairId),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const week = tournament.weekIndex
    ? `Fecha ${tournament.weekIndex}${tournament.rankingWeekCount ? ` de ${tournament.rankingWeekCount}` : ""}`
    : null;
  const meta: CompetitionMetaItem[] = [
    nested ? null : { icon: Building2, text: tournament.clubName },
    { icon: Calendar, text: formatDateRangeShortEs(tournament.startDate, tournament.endDate) },
    tournament.partnerName ? { icon: Users, text: `Pareja: ${tournament.partnerName}` } : null,
    !nested && week && tournament.rankingCircuitName
      ? { icon: Flag, text: `${week} · ${tournament.rankingCircuitName}` }
      : null,
  ].filter((item): item is CompetitionMetaItem => item !== null && Boolean(item.text));
  const unbeaten = tournament.matchesWon > 0 && tournament.matchesLost === 0;

  return (
    <CompetitionCard
      title={nested && week ? `${week} · ${tournament.name}` : tournament.name}
      imageUrl={tournament.imageUrl}
      result={tournamentResultView(tournament.result)}
      meta={meta}
      points={tournament.points}
      nested={nested}
      open={open}
      onToggle={() => setOpen((value) => !value)}
      testId={`public-player-tournament-${tournament.tournamentId}`}
      outcome={
        <p className="text-sm font-bold text-success tabular-nums">
          {tournament.matchesWon}G – {tournament.matchesLost}P
          {unbeaten ? <span className="ml-1 font-semibold">· invicto</span> : null}
        </p>
      }
    >
      <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Recorrido en el torneo
      </p>
      <CompetitionPanel
        isLoading={matches.isLoading}
        isError={matches.isError}
        isEmpty={(matches.data?.length ?? 0) === 0}
        errorText="No pudimos cargar los partidos."
        emptyText="Todavía no hay partidos jugados."
      >
        {sortByStage(matches.data ?? []).map((item) => (
          <TournamentRouteMatch
            key={item.match.id}
            item={item}
            pairId={tournament.pairId}
            onOpenResult={onOpenResult}
            onOpenPair={onOpenPair}
          />
        ))}
      </CompetitionPanel>
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 pt-1 text-xs font-medium">
        {tournament.partnerName && tournament.partnerUserId ? (
          <Link
            to={ROUTES.player.playerProfile(tournament.partnerUserId)}
            className="inline-flex items-center gap-1 text-foreground hover:underline"
          >
            Perfil de {tournament.partnerName}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
        <Link
          to={ROUTES.player.tournamentDetail(tournament.tournamentId)}
          className="inline-flex items-center gap-1 text-foreground hover:underline"
        >
          Ver torneo
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </CompetitionCard>
  );
}
