import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Medal } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { PERMISSION_CLUB_TOURNAMENTS_WRITE } from "@/authorization/permissionCodes";
import { EmptyState } from "@/components/EmptyState";
import { PermissionsGuard } from "@/components/guards";
import { RankingCircuitCard } from "@/components/rankings";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/router/routes";

type Scope = "live" | "finished";

export default function ClubRankingScreen() {
  const { clubId } = useMockSession();
  const [scope, setScope] = useState<Scope>("live");
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["club-rankings", clubId, scope],
    queryFn: () => Api.RankingService().listClub(scope),
    enabled: Boolean(clubId),
  });

  return (
    <div className="space-y-6" data-testid="club-rankings">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Ranking</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Circuitos Quality semanales del club.
          </p>
        </div>
        <PermissionsGuard permission={PERMISSION_CLUB_TOURNAMENTS_WRITE}>
          <Link to={ROUTES.club.rankingNew} className={cn(buttonVariants())}>
            Nuevo ranking
          </Link>
        </PermissionsGuard>
      </div>

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
          Finalizados
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : null}
      {isError ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title="No se pudieron cargar los rankings"
        />
      ) : null}
      {!isLoading && !isError && data.length === 0 ? (
        <EmptyState
          icon={Medal}
          title={scope === "live" ? "No hay rankings en curso." : "Todavía no hay rankings finalizados."}
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.map((circuit) => (
          <RankingCircuitCard
            key={circuit.id}
            circuit={circuit}
            to={ROUTES.club.rankingDetail(circuit.id)}
            showClub={false}
          />
        ))}
      </div>
    </div>
  );
}
