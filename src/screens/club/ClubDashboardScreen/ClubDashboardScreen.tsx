import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { MapPin, Plus, Users } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import {
  PERMISSION_CLUB_CLIENTS_READ,
  PERMISSION_CLUB_COURTS_READ,
  PERMISSION_CLUB_RESERVATIONS_READ,
  PERMISSION_CLUB_RESERVATIONS_WRITE,
  usePermissions,
} from "@/authorization";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClubTodayTurn } from "@/modules/reservations";
import type { CourtReservation as DomainReservation } from "@/domain";
import CourtReservationModal from "@/screens/club/ClubCourtsScreen/components/CourtReservationModal";
import { ROUTES } from "@/router/routes";
import DashboardPendingTray from "./components/DashboardPendingTray";
import DashboardSummaryCards, {
  CardSkeleton,
  PendingCountCard,
  PendingTraySkeleton,
  TodayTurnsSkeleton,
} from "./components/DashboardSummaryCards";
import DashboardTodayTurns from "./components/DashboardTodayTurns";

export default function ClubDashboardScreen() {
  const { can } = usePermissions();
  const { clubId } = useMockSession();
  const queryClient = useQueryClient();
  const canRead = can(PERMISSION_CLUB_RESERVATIONS_READ);
  const canWrite = can(PERMISSION_CLUB_RESERVATIONS_WRITE);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<DomainReservation | null>(null);
  const [createSlot, setCreateSlot] = useState<ClubTodayTurn | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["club-reservation-summary", clubId],
    queryFn: () => Api.ReservationService().getSummary(),
    enabled: canRead && Boolean(clubId),
  });
  const todayQuery = useQuery({
    queryKey: ["club-reservation-today", clubId],
    queryFn: () => Api.ReservationService().listToday(),
    enabled: canRead && Boolean(clubId),
  });
  const pendingQuery = useQuery({
    queryKey: ["court-reservations-pending", clubId],
    queryFn: () => Api.ReservationService().listPending(),
    enabled: canRead && Boolean(clubId),
  });
  const courtsQuery = useQuery({
    queryKey: ["club-courts", clubId],
    queryFn: () => Api.CourtService().list(),
    enabled: canWrite && Boolean(clubId),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["club-reservation-summary", clubId] });
    void queryClient.invalidateQueries({ queryKey: ["club-reservation-today", clubId] });
    void queryClient.invalidateQueries({ queryKey: ["court-reservations-pending", clubId] });
    void queryClient.invalidateQueries({ queryKey: ["court-reservations-calendar"] });
    void queryClient.invalidateQueries({ queryKey: ["court-slots"] });
  };

  const openTurn = (turn: ClubTodayTurn) => {
    if (turn.status === "free") {
      if (!canWrite) return;
      setCreateSlot(turn);
      return;
    }
    if (!turn.reservationId) return;
    setView(turnAsReservation(turn));
  };

  return (
    <div className="space-y-6" data-testid="club-dashboard">
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Accesos rápidos</h3>
        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus />
              Nueva reserva
            </Button>
          ) : null}
          {can(PERMISSION_CLUB_CLIENTS_READ) ? (
            <Link to={ROUTES.club.clients} className={cn(buttonVariants({ variant: "outline" }))}>
              <Users />
              Clientes
            </Link>
          ) : null}
          {can(PERMISSION_CLUB_COURTS_READ) ? (
            <Link to={ROUTES.club.courts} className={cn(buttonVariants({ variant: "outline" }))}>
              <MapPin />
              Canchas
            </Link>
          ) : null}
        </div>
      </section>

      {canRead ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardSummaryCards
              summary={summaryQuery.data}
              isLoading={summaryQuery.isLoading}
              isError={summaryQuery.isError}
            />
            {pendingQuery.isLoading ? (
              <CardSkeleton hero emphasis />
            ) : (
              <PendingCountCard count={(pendingQuery.data ?? []).length} />
            )}
          </section>

          {pendingQuery.isLoading ? (
            <PendingTraySkeleton />
          ) : (
            <DashboardPendingTray
              reservations={pendingQuery.data ?? []}
              canMutate={canWrite}
              viewAllTo={can(PERMISSION_CLUB_COURTS_READ) ? ROUTES.club.courts : undefined}
              onChanged={refresh}
            />
          )}

          {todayQuery.isLoading ? (
            <TodayTurnsSkeleton />
          ) : todayQuery.isError ? (
            <p className="text-sm text-muted-foreground">No se pudieron cargar los turnos de hoy.</p>
          ) : (
            <DashboardTodayTurns turns={todayQuery.data ?? []} onOpen={openTurn} />
          )}
        </>
      ) : null}

      <CourtReservationModal
        open={creating || createSlot != null || view != null}
        clubId={clubId ?? ""}
        courts={courtsQuery.data ?? []}
        initialCourtId={createSlot?.courtId ?? view?.courtId ?? null}
        mode={view ? "view" : "create"}
        presetStartsAt={createSlot?.startsAt ?? null}
        initialDate={createSlot ? dayjs(createSlot.startsAt).format("YYYY-MM-DD") : null}
        preselectSlot={createSlot != null}
        reservation={view}
        canMutate={canWrite}
        onOpenChange={(open) => {
          if (open) return;
          setCreating(false);
          setCreateSlot(null);
          setView(null);
        }}
        onSaved={() => {
          setCreating(false);
          setCreateSlot(null);
          setView(null);
          refresh();
        }}
      />
    </div>
  );
}

function turnAsReservation(turn: ClubTodayTurn): DomainReservation {
  const status = turn.status === "free" ? "booked" : turn.status;
  return {
    id: turn.reservationId ?? "",
    clubId: "",
    clientId: "",
    courtId: turn.courtId,
    courtName: turn.courtName,
    playerFirstName: turn.playerFirstName ?? "",
    playerLastName: turn.playerLastName ?? "",
    startsAt: turn.startsAt,
    endsAt: turn.endsAt,
    status,
    price: null,
    createdAt: turn.startsAt,
  };
}
