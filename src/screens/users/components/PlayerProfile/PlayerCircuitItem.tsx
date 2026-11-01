import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Calendar, CalendarCheck, Gift } from "lucide-react";
import Api from "@/api/Api";
import type { PlayerMatchView, PublicPlayerCircuit } from "@/domain";
import { formatDateRangeShortEs } from "@/lib/dates";
import CompetitionCard, { type CompetitionMetaItem } from "./CompetitionCard";
import CompetitionPanel from "./CompetitionPanel";
import { circuitResultView } from "./competitionResult";
import PlayerTournamentItem from "./PlayerTournamentItem";

interface PlayerCircuitItemProps {
  userId: string;
  circuit: PublicPlayerCircuit;
  onOpenResult: (item: PlayerMatchView) => void;
  onOpenPair: (item: PlayerMatchView, pairId: string) => void;
}

export default function PlayerCircuitItem({
  userId,
  circuit,
  onOpenResult,
  onOpenPair,
}: PlayerCircuitItemProps) {
  const [open, setOpen] = useState(false);
  const dates = useQuery({
    queryKey: ["public-player-circuit-dates", userId, circuit.circuitId],
    queryFn: () => Api.TournamentOpsService().getPublicPlayerCircuitDates(userId, circuit.circuitId),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const datesLabel = circuit.weekCount
    ? `${circuit.datesPlayed} de ${circuit.weekCount} fechas`
    : `${circuit.datesPlayed} ${circuit.datesPlayed === 1 ? "fecha" : "fechas"}`;
  const meta: CompetitionMetaItem[] = [
    { icon: Building2, text: circuit.clubName },
    { icon: Calendar, text: formatDateRangeShortEs(circuit.startDate, circuit.endDate) },
    { icon: CalendarCheck, text: datesLabel },
    circuit.prizeLabel ? { icon: Gift, text: circuit.prizeLabel } : null,
  ].filter((item): item is CompetitionMetaItem => item !== null && Boolean(item.text));

  return (
    <CompetitionCard
      title={circuit.name}
      imageUrl={circuit.imageUrl}
      result={circuitResultView(circuit.place)}
      meta={meta}
      points={circuit.points}
      open={open}
      onToggle={() => setOpen((value) => !value)}
      testId={`public-player-circuit-${circuit.circuitId}`}
      outcome={
        <p className="text-sm font-black tabular-nums text-foreground">
          {circuit.place !== null ? `${circuit.place}°` : "—"}
          {circuit.place !== null && circuit.rankedPlayers ? (
            <span className="ml-1 font-semibold text-muted-foreground">de {circuit.rankedPlayers}</span>
          ) : null}
        </p>
      }
    >
      <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Fechas jugadas
      </p>
      <CompetitionPanel
        isLoading={dates.isLoading}
        isError={dates.isError}
        isEmpty={(dates.data?.length ?? 0) === 0}
        errorText="No pudimos cargar las fechas del circuito."
        emptyText="No hay fechas jugadas en este circuito."
      >
        {dates.data?.map((tournament) => (
          <PlayerTournamentItem
            key={tournament.tournamentId}
            userId={userId}
            tournament={tournament}
            nested
            onOpenResult={onOpenResult}
            onOpenPair={onOpenPair}
          />
        ))}
      </CompetitionPanel>
    </CompetitionCard>
  );
}
