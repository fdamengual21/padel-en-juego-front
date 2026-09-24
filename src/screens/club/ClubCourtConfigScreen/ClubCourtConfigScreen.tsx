import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Club } from "@/domain";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { usePermissions } from "@/authorization";
import { PERMISSION_CLUB_COURTS_WRITE } from "@/authorization/permissionCodes";
import { useClubSession } from "@/hooks/useClubSession";
import { ROUTES } from "@/router/routes";
import CourtConfigForm from "./components/CourtConfigForm";

export default function ClubCourtConfigScreen() {
  const { courtId = "" } = useParams();
  const navigate = useNavigate();
  const { clubId } = useMockSession();
  const { can } = usePermissions();
  const { session } = useClubSession();
  const queryClient = useQueryClient();

  const courtQuery = useQuery({
    queryKey: ["court", clubId, courtId],
    queryFn: () => Api.CourtService().getById(courtId),
    enabled: Boolean(clubId && courtId),
  });

  const court = courtQuery.data;
  const club: Club = {
    id: clubId,
    name: session?.name ?? "Club",
    status: session?.isActive === false ? "inactive" : "active",
    province: null,
    city: null,
    openTime: session?.openTime ?? "08:00",
    closeTime: session?.closeTime ?? "23:00",
    openDays: session?.openDays ?? [],
    createdAt: "",
    updatedAt: "",
  };

  if (courtQuery.isLoading) {
    return <p className="text-base text-muted-foreground">Cargando cancha…</p>;
  }

  if (courtQuery.isError || !court) {
    return (
      <div className="space-y-3">
        <p className="text-base text-muted-foreground">No se encontró la cancha.</p>
        <Link to={ROUTES.club.courts} className="text-sm text-sidebar hover:underline">
          ← Canchas
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4" data-testid="club-court-config">
      <Link to={ROUTES.club.courts} className="inline-block text-sm text-sidebar hover:underline">
        ← Canchas
      </Link>
      <CourtConfigForm
        club={club}
        court={court}
        priceRules={court.priceRules ?? []}
        readOnly={!can(PERMISSION_CLUB_COURTS_WRITE)}
        onCancel={() => navigate(ROUTES.club.courts)}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ["courts", clubId] });
          void queryClient.invalidateQueries({ queryKey: ["court", clubId, courtId] });
          navigate(ROUTES.club.courts);
        }}
      />
    </div>
  );
}
