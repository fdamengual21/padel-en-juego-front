import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { buttonVariants } from "@/components/ui/button";
import ClientDetailModal from "@/screens/club/ClubClientDetailScreen/components/ClientDetailModal";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";
import DashboardMatchCard from "./components/DashboardMatchCard";
import DashboardReservationCard from "./components/DashboardReservationCard";

export default function ClubDashboardScreen() {
  const { clubId } = useMockSession();
  const [clientDetailId, setClientDetailId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", clubId],
    queryFn: () => Api.TournamentOpsService().getDashboard(clubId),
  });

  if (isLoading || !data) {
    return <p className="text-muted-foreground">Cargando dashboard…</p>;
  }

  return (
    <div className="space-y-6" data-testid="club-dashboard">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Qué está pasando ahora</p>
        </div>
        <Link to={ROUTES.club.tournamentNew} className={cn(buttonVariants())}>
          Nuevo torneo
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Inscritos" value={String(data.registeredPairs)} />
        <Stat label="En juego" value={String(data.liveMatches)} />
        <Stat label="Canchas" value={`${data.courtsInUse}/${data.courtsTotal}`} />
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-medium">Próximas reservas</h3>
        {data.upcomingReservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay reservas próximas.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.upcomingReservations.map((item) => (
              <DashboardReservationCard
                key={item.reservation.id}
                item={item}
                onOpenClient={setClientDetailId}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-medium">Próximos partidos de torneo</h3>
        {data.upcomingMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay partidos de torneo programados.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.upcomingMatches.map((item) => (
              <DashboardMatchCard
                key={item.match.id}
                item={item}
                onOpenClient={setClientDetailId}
              />
            ))}
          </div>
        )}
      </section>

      <ClientDetailModal
        open={Boolean(clientDetailId)}
        clubId={clubId}
        clientId={clientDetailId}
        onOpenChange={(open) => {
          if (!open) setClientDetailId(null);
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}
