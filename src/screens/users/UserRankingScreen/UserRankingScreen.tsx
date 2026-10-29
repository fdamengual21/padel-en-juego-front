import { useQuery } from "@tanstack/react-query";
import { Medal } from "lucide-react";
import Api from "@/api/Api";
import { EmptyState } from "@/components/EmptyState";

export default function UserRankingScreen() {
  const { data: standings = [] } = useQuery({
    queryKey: ["ranking", "cat-1"],
    queryFn: () => Api.TournamentOpsService().getRanking("cat-1"),
  });
  const { data: pairs = [] } = useQuery({
    queryKey: ["pairs", "cat-1"],
    queryFn: () => Api.TournamentOpsService().listPairs("cat-1"),
  });
  const { data: players = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => Api.TournamentOpsService().listPlayers(),
  });

  const label = (pairId: string) => {
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return pairId;
    const p1 = players.find((p) => p.id === pair.player1Id)?.displayName ?? "?";
    const p2 = players.find((p) => p.id === pair.player2Id)?.displayName ?? "?";
    return `${p1} / ${p2}`;
  };

  return (
    <div className="p-4 space-y-4" data-testid="player-ranking">
      <h2 className="text-2xl font-semibold tracking-tight">Ranking</h2>
      {standings.length === 0 ? (
        <EmptyState
          icon={Medal}
          title="Todavía no hay posiciones"
          description="Cuando se jueguen partidos, el ranking se va a completar acá."
        />
      ) : (
        <ol className="divide-y divide-border rounded-xl border border-border bg-card">
          {standings
            .slice()
            .sort((a, b) => b.points - a.points || a.position - b.position)
            .map((row, index) => (
              <li key={row.id} className="flex justify-between px-4 py-3 text-sm">
                <span>
                  <strong className="mr-2">{row.position || index + 1}</strong>
                  {label(row.pairId)}
                </span>
                <span className="font-semibold tabular-nums">{row.points} pts</span>
              </li>
            ))}
        </ol>
      )}
    </div>
  );
}
