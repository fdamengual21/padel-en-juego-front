import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import TournamentDetailView from "@/components/tournaments/TournamentDetailView";
import { ROUTES } from "@/router/routes";

/** Detalle de torneo — modo club (admin, con mutaciones). Una fecha de ranking vive bajo el ranking. */
export default function ClubTournamentDetailScreen() {
  const { tournamentId = "" } = useParams();
  const { data: tournament } = useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn: () => Api.TournamentService().getById(tournamentId),
    enabled: Boolean(tournamentId),
  });
  if (tournament?.rankingCircuitId) {
    return (
      <Navigate replace to={ROUTES.club.rankingEvent(tournament.rankingCircuitId, tournament.id)} />
    );
  }
  return (
    <TournamentDetailView tournamentId={tournamentId} />
  );
}
