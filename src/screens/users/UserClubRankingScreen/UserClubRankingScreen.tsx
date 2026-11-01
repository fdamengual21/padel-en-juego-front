import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, CircleAlert, Medal } from "lucide-react";
import Api from "@/api/Api";
import { EmptyState } from "@/components/EmptyState";
import { RankingCircuitCard } from "@/components/rankings";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";

type Scope = "live" | "finished";

export default function UserClubRankingScreen() {
  const { clubId = "" } = useParams();
  const [scope, setScope] = useState<Scope>("live");
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["public-club-rankings", clubId, scope],
    queryFn: () => Api.RankingService().listPublicByClub(clubId, scope),
    enabled: Boolean(clubId),
  });

  return (
    <div className="space-y-5 p-4 md:p-0" data-testid="public-club-rankings">
      <Link
        to={ROUTES.player.clubDetail(clubId)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Club
      </Link>
      <h2 className="text-2xl font-semibold tracking-tight">Ranking</h2>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={scope === "live" ? "default" : "outline"}
          onClick={() => setScope("live")}
        >
          En curso
        </Button>
        <Button
          type="button"
          size="sm"
          variant={scope === "finished" ? "default" : "outline"}
          onClick={() => setScope("finished")}
        >
          Anteriores
        </Button>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}
      {isError ? (
        <EmptyState tone="error" icon={CircleAlert} title="No se pudieron cargar los rankings" />
      ) : null}
      {!isLoading && !isError && data.length === 0 ? (
        <EmptyState
          icon={Medal}
          title={scope === "live" ? "No hay rankings en curso." : "No hay rankings anteriores."}
        />
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.map((circuit) => (
          <RankingCircuitCard
            key={circuit.id}
            circuit={circuit}
            to={ROUTES.player.clubRankingDetail(clubId, circuit.id)}
            showClub={false}
          />
        ))}
      </div>
    </div>
  );
}
