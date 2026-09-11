import { useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import MatchCard from "@/components/tournaments/MatchCard";

export default function UserHistoryScreen() {
  const { playerId } = useMockSession();
  const { data } = useQuery({
    queryKey: ["player-home", playerId],
    queryFn: () => Api.TournamentOpsService().getPlayerHome(playerId),
  });
  const { data: pairs = [] } = useQuery({
    queryKey: ["pairs", "cat-1"],
    queryFn: () => Api.TournamentOpsService().listPairs("cat-1"),
  });
  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => Api.TournamentOpsService().listPlayers(),
  });
  const pairLabel = (id: string | null) => {
    if (!id) return "Por definir";
    const pair = pairs.find((p) => p.id === id);
    if (!pair) return id;
    const p1 = players.find((p) => p.id === pair.player1Id)?.displayName ?? "?";
    const p2 = players.find((p) => p.id === pair.player2Id)?.displayName ?? "?";
    return `${p1} / ${p2}`;
  };

  return (
    <div className="p-4 space-y-4" data-testid="player-history">
      <h2 className="text-2xl font-semibold tracking-tight">Historial</h2>
      <div className="space-y-3">
        {(data?.recentMatches ?? []).map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            pairALabel={pairLabel(match.pairAId)}
            pairBLabel={pairLabel(match.pairBId)}
          />
        ))}
        {(data?.recentMatches?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Sin partidos finalizados.</p>
        ) : null}
      </div>
    </div>
  );
}
