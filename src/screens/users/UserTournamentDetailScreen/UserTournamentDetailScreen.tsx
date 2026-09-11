import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import Api from "@/api/Api";
import BracketView from "@/components/tournaments/BracketView";

export default function UserTournamentDetailScreen() {
  const { tournamentId = "" } = useParams();
  const { data: tournament } = useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn: () => Api.TournamentService().getById(tournamentId),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", tournamentId],
    queryFn: () => Api.TournamentOpsService().listCategories(tournamentId),
  });
  const categoryId = categories[0]?.id ?? "cat-1";
  const { data: bracket } = useQuery({
    queryKey: ["bracket", categoryId],
    queryFn: () => Api.TournamentOpsService().getBracket(categoryId),
  });
  const { data: pairs = [] } = useQuery({
    queryKey: ["pairs", categoryId],
    queryFn: () => Api.TournamentOpsService().listPairs(categoryId),
  });
  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => Api.TournamentOpsService().listPlayers(),
  });

  const pairLabels: Record<string, string> = {};
  for (const pair of pairs) {
    const p1 = players.find((p) => p.id === pair.player1Id)?.displayName ?? "?";
    const p2 = players.find((p) => p.id === pair.player2Id)?.displayName ?? "?";
    pairLabels[pair.id] = `${p1} / ${p2}`;
  }

  return (
    <div className="p-4 space-y-4" data-testid="player-tournament-detail">
      <h2 className="text-2xl font-semibold tracking-tight">
        {tournament?.name ?? "Torneo"}
      </h2>
      <BracketView
        rounds={bracket?.rounds ?? []}
        matches={bracket?.matches ?? []}
        slots={bracket?.slots ?? []}
        pairLabels={pairLabels}
      />
    </div>
  );
}
