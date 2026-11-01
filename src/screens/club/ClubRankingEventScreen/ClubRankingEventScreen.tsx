import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import TournamentDetailView from "@/components/tournaments/TournamentDetailView";
import { ROUTES } from "@/router/routes";

/** Fecha de un ranking: el detalle de torneo con el flujo de fecha de circuito. */
export default function ClubRankingEventScreen() {
  const { circuitId = "", tournamentId = "" } = useParams();
  const { data: tournament } = useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn: () => Api.TournamentService().getById(tournamentId),
    enabled: Boolean(tournamentId),
  });
  if (tournament && !tournament.rankingCircuitId) {
    return <Navigate replace to={ROUTES.club.tournamentDetail(tournament.id)} />;
  }
  if (tournament?.rankingCircuitId && tournament.rankingCircuitId !== circuitId) {
    return (
      <Navigate replace to={ROUTES.club.rankingEvent(tournament.rankingCircuitId, tournament.id)} />
    );
  }
  return <TournamentDetailView tournamentId={tournamentId} />;
}
