import { memo, useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import {
  PERMISSION_CLUB_CLIENTS_READ,
  PERMISSION_CLUB_COURTS_READ,
  PERMISSION_CLUB_RESERVATIONS_WRITE,
  PERMISSION_CLUB_SETTINGS_READ,
  usePermissions,
} from "@/authorization";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Court, CourtReservation as DomainReservation } from "@/domain";
import type { ClubTodayTurn } from "@/modules/reservations";
import CourtReservationModal from "@/screens/club/ClubCourtsScreen/components/CourtReservationModal";
import { ROUTES } from "@/router/routes";
import { useClubSessionStore } from "@/stores/clubSessionStore";
import DashboardClubCard from "./DashboardClubCard";
import DashboardOccupancyHelp, { OccupancyDetailDialog } from "./DashboardOccupancyHelp";
import DashboardPendingTray from "@/screens/club/components/ClubPendingTray";
import { FreeSlotsCard, IncomeCard, OccupancyCard } from "./DashboardSummaryCards";
import DashboardTodayTurns from "./DashboardTodayTurns";

const OccupancyCardView = memo(OccupancyCard);
const FreeSlotsCardView = memo(FreeSlotsCard);
const IncomeCardView = memo(IncomeCard);
const ClubCardView = memo(DashboardClubCard);
const PendingTrayView = memo(DashboardPendingTray);
const TodayTurnsView = memo(DashboardTodayTurns);
const OccupancyHelpView = memo(DashboardOccupancyHelp);

function DashboardReservationsSection() {
  const { can } = usePermissions();
  const { clubId } = useMockSession();
  const session = useClubSessionStore((state) => state.session);
  const queryClient = useQueryClient();
  const canWrite = can(PERMISSION_CLUB_RESERVATIONS_WRITE);
  const canCourts = can(PERMISSION_CLUB_COURTS_READ);
  const canClients = can(PERMISSION_CLUB_CLIENTS_READ);
  const canSettings = can(PERMISSION_CLUB_SETTINGS_READ);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<DomainReservation | null>(null);
  const [createSlot, setCreateSlot] = useState<ClubTodayTurn | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ["club-reservation-summary", clubId],
    queryFn: () => Api.ReservationService().getSummary(),
    enabled: Boolean(clubId),
  });
  const todayQuery = useQuery({
    queryKey: ["club-reservation-today", clubId],
    queryFn: () => Api.ReservationService().listToday(),
    enabled: Boolean(clubId),
  });
  const pendingQuery = useQuery({
    queryKey: ["court-reservations-pending", clubId],
    queryFn: () => Api.ReservationService().listPending(),
    enabled: Boolean(clubId),
  });
  const courtsQuery = useQuery({
    queryKey: ["club-courts", clubId],
    queryFn: () => Api.CourtService().list(),
    enabled: canCourts && Boolean(clubId),
  });
  const settingsQuery = useQuery({
    queryKey: ["club-settings", clubId],
    queryFn: () => Api.ClubService().getSettings(),
    enabled: canSettings && Boolean(clubId),
  });
  const clientsQuery = useQuery({
    queryKey: ["club-clients-count", clubId],
    queryFn: () => Api.ClientService().list({ page: 1, pageSize: 1 }),
    enabled: canClients && Boolean(clubId),
  });
  const fixedQuery = useQuery({
    queryKey: ["club-fixed-count", clubId],
    queryFn: () => Api.ReservationService().listFixed({ page: 1, pageSize: 1 }),
    enabled: Boolean(clubId),
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["club-reservation-summary", clubId] });
    void queryClient.invalidateQueries({ queryKey: ["club-reservation-today", clubId] });
    void queryClient.invalidateQueries({ queryKey: ["court-reservations-pending", clubId] });
    void queryClient.invalidateQueries({ queryKey: ["club-fixed-count", clubId] });
    void queryClient.invalidateQueries({ queryKey: ["court-reservations-calendar"] });
    void queryClient.invalidateQueries({ queryKey: ["court-slots"] });
  }, [clubId, queryClient]);

  const openTurn = useCallback(
    (turn: ClubTodayTurn) => {
      if (turn.status === "free") {
        if (!canWrite) return;
        setCreateSlot(turn);
        return;
      }
      if (!turn.reservationId) return;
      setView(turnAsReservation(turn));
    },
    [canWrite],
  );

  const openHelp = useCallback(() => setHelpOpen(true), []);
  const startCreating = useCallback(() => setCreating(true), []);
  const closeReservation = useCallback((open: boolean) => {
    if (open) return;
    setCreating(false);
    setCreateSlot(null);
    setView(null);
  }, []);
  const saveReservation = useCallback(() => {
    setCreating(false);
    setCreateSlot(null);
    setView(null);
    refresh();
  }, [refresh]);

  const activeCourts = useMemo(
    () => (courtsQuery.data ?? []).filter((court) => court.status === "active").length,
    [courtsQuery.data],
  );
  const courtsStat = useMemo(
    () => ({
      label: "Canchas",
      value: courtsQuery.data ? activeCourts : null,
      href: ROUTES.club.courts,
      isLoading: courtsQuery.isLoading,
      isError: courtsQuery.isError,
      hidden: !canCourts,
    }),
    [activeCourts, canCourts, courtsQuery.data, courtsQuery.isError, courtsQuery.isLoading],
  );
  const clientsStat = useMemo(
    () => ({
      label: "Clientes",
      value: clientsQuery.data?.totalItems ?? null,
      href: ROUTES.club.clients,
      isLoading: clientsQuery.isLoading,
      isError: clientsQuery.isError,
      hidden: !canClients,
    }),
    [canClients, clientsQuery.data, clientsQuery.isError, clientsQuery.isLoading],
  );
  const fixedStat = useMemo(
    () => ({
      label: "Fijos",
      value: fixedQuery.data?.seriesCount ?? null,
      href: ROUTES.club.fixedReservations,
      isLoading: fixedQuery.isLoading,
      isError: fixedQuery.isError,
      hidden: false,
    }),
    [fixedQuery.data, fixedQuery.isError, fixedQuery.isLoading],
  );
  const turns = todayQuery.data ?? EMPTY_TURNS;
  const pending = pendingQuery.data ?? EMPTY_RESERVATIONS;
  const agendaTo = canCourts ? ROUTES.club.courts : undefined;
  const slotsHref = canCourts ? ROUTES.club.courts : undefined;

  return (
    <>
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Accesos rápidos</h3>
        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <Button type="button" onClick={startCreating}>
              <Plus />
              Nueva reserva
            </Button>
          ) : null}
          {canCourts ? (
            <Link to={ROUTES.club.courts} className={cn(buttonVariants({ variant: "outline" }), "bg-card")}>
              <CalendarDays />
              Agenda
            </Link>
          ) : null}
          {canClients ? (
            <Link to={ROUTES.club.clients} className={cn(buttonVariants({ variant: "outline" }), "bg-card")}>
              <Users />
              Clientes
            </Link>
          ) : null}
          {canCourts ? (
            <Link to={ROUTES.club.courts} className={cn(buttonVariants({ variant: "outline" }), "bg-card")}>
              <MapPin />
              Canchas
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid items-stretch gap-3 xl:grid-cols-3">
        <OccupancyCardView
          summary={summaryQuery.data}
          isLoading={summaryQuery.isLoading}
          isError={summaryQuery.isError}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:h-full xl:grid-cols-1 xl:grid-rows-2">
          <FreeSlotsCardView
            summary={summaryQuery.data}
            isLoading={summaryQuery.isLoading}
            isError={summaryQuery.isError}
            href={slotsHref}
          />
          <IncomeCardView
            summary={summaryQuery.data}
            isLoading={summaryQuery.isLoading}
            isError={summaryQuery.isError}
          />
        </div>
        <ClubCardView
          session={session}
          settings={settingsQuery.data}
          settingsLoading={canSettings && settingsQuery.isLoading}
          settingsError={settingsQuery.isError}
          canSeeSettings={canSettings}
          courts={courtsStat}
          clients={clientsStat}
          fixed={fixedStat}
          tournament={null}
          tournamentLoading={false}
          tournamentError={false}
          showTournament={false}
        />
      </section>

      <section className="grid items-start gap-3 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <PendingTrayView
            reservations={pending}
            isLoading={pendingQuery.isLoading}
            isError={pendingQuery.isError}
            canMutate={canWrite}
            viewAllTo={agendaTo}
            onChanged={refresh}
          />
        </div>
        <OccupancyHelpView onMore={openHelp} />
      </section>

      <TodayTurnsView
        turns={turns}
        isLoading={todayQuery.isLoading}
        isError={todayQuery.isError}
        agendaTo={agendaTo}
        onOpen={openTurn}
      />
      <OccupancyDetailDialog open={helpOpen} onOpenChange={setHelpOpen} />

      <CourtReservationModal
        open={creating || createSlot != null || view != null}
        clubId={clubId ?? ""}
        courts={courtsQuery.data ?? EMPTY_COURTS}
        initialCourtId={createSlot?.courtId ?? view?.courtId ?? null}
        mode={view ? "view" : "create"}
        presetStartsAt={createSlot?.startsAt ?? null}
        initialDate={createSlot ? dayjs(createSlot.startsAt).format("YYYY-MM-DD") : null}
        preselectSlot={createSlot != null}
        reservation={view}
        canMutate={canWrite}
        onOpenChange={closeReservation}
        onSaved={saveReservation}
      />
    </>
  );
}

const EMPTY_TURNS: ClubTodayTurn[] = [];
const EMPTY_RESERVATIONS: DomainReservation[] = [];
const EMPTY_COURTS: Court[] = [];

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

export default memo(DashboardReservationsSection);
