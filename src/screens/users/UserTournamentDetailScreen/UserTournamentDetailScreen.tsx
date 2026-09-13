import { useParams } from "react-router-dom";
import TournamentDetailView from "@/components/tournaments/TournamentDetailView";

/**
 * Detalle de torneo — vista jugador (logueado o guest).
 * Misma UI que el club en solo lectura + CTA de inscripción.
 */
export default function UserTournamentDetailScreen() {
  const { tournamentId = "" } = useParams();
  return (
    <TournamentDetailView audience="player" tournamentId={tournamentId} />
  );
}
