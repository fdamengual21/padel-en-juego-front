import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";
import ClientDetailContent from "./components/ClientDetailContent";

export default function ClubClientDetailScreen() {
  const { clientId = "" } = useParams();
  const { clubId } = useMockSession();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["club-client", clubId, clientId],
    queryFn: () => Api.TournamentOpsService().getClubClientDetail(clubId, clientId),
    enabled: Boolean(clientId),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando cliente…</p>;
  }

  if (isError || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">No se encontró el cliente.</p>
        <Link to={ROUTES.club.clients} className={cn(buttonVariants({ variant: "outline" }))}>
          Volver a clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="club-client-detail">
      <Link
        to={ROUTES.club.clients}
        className="inline-block text-sm text-sidebar hover:underline"
      >
        ← Clientes
      </Link>

      <ClientDetailContent data={data} />
    </div>
  );
}
