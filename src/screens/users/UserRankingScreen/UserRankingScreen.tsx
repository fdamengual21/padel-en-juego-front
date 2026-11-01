import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Medal } from "lucide-react";
import Api from "@/api/Api";
import { EmptyState } from "@/components/EmptyState";
import { RankingCircuitCard } from "@/components/rankings";
import { ROUTES } from "@/router/routes";

export default function UserRankingScreen() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["public-rankings"],
    queryFn: () => Api.RankingService().listPublic(),
  });

  return (
    <div className="space-y-4 p-4 md:p-0" data-testid="player-ranking">
      <h2 className="text-2xl font-semibold tracking-tight">Ranking</h2>
      <p className="text-sm text-muted-foreground">
        Circuitos Quality en curso. Entrá a un club para ver la tabla completa.
      </p>
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}
      {isError ? (
        <EmptyState tone="error" icon={CircleAlert} title="No se pudieron cargar los rankings" />
      ) : null}
      {!isLoading && !isError && data.length === 0 ? (
        <EmptyState
          icon={Medal}
          title="Todavía no hay rankings en curso"
          description="Cuando un club publique un circuito, va a aparecer acá."
        />
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.map((circuit) => (
          <RankingCircuitCard
            key={circuit.id}
            circuit={circuit}
            to={ROUTES.player.clubRankingDetail(circuit.clubId, circuit.id)}
          />
        ))}
      </div>
    </div>
  );
}
