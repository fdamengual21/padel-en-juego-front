import { useParams } from "react-router-dom";
import TournamentDetailView from "@/components/tournaments/TournamentDetailView";

/** Detalle de torneo — modo club (admin, con mutaciones). */
export default function ClubTournamentDetailScreen() {
  const { tournamentId = "" } = useParams();
  return (
    <TournamentDetailView audience="club" tournamentId={tournamentId} />
  );
}
