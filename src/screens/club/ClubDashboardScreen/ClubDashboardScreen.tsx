import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import {
  PERMISSION_CLUB_CLIENTS_READ,
  PERMISSION_CLUB_COURTS_READ,
  PERMISSION_CLUB_RESERVATIONS_READ,
  PERMISSION_CLUB_RESERVATIONS_WRITE,
  PERMISSION_CLUB_SETTINGS_READ,
  PERMISSION_CLUB_TOURNAMENTS_READ,
  usePermissions,
} from "@/authorization";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Tournament } from "@/domain";
import type { ClubTodayTurn } from "@/modules/reservations";
import type { CourtReservation as DomainReservation } from "@/domain";
import CourtReservationModal from "@/screens/club/ClubCourtsScreen/components/CourtReservationModal";
import { ROUTES } from "@/router/routes";
import { useClubSessionStore } from "@/stores/clubSessionStore";
import DashboardClubCard from "./components/DashboardClubCard";
import DashboardOccupancyHelp, { OccupancyDetailDialog } from "./components/DashboardOccupancyHelp";
import DashboardPageHeader from "./components/DashboardPageHeader";
import DashboardPendingTray from "@/screens/club/components/ClubPendingTray";
import { FreeSlotsCard, IncomeCard, OccupancyCard } from "./components/DashboardSummaryCards";
import DashboardTodayTurns from "./components/DashboardTodayTurns";

export default function ClubDashboardScreen() {
  const { can } = usePermissions();
  const { clubId, player } = useMockSession();
  const session = useClubSessionStore((state) => state.session);
  const queryClient = useQueryClient();
  const canRead = can(PERMISSION_CLUB_RESERVATIONS_READ);
  const canWrite = can(PERMISSION_CLUB_RESERVATIONS_WRITE);
  const canCourts = can(PERMISSION_CLUB_COURTS_READ);
  const canClients = can(PERMISSION_CLUB_CLIENTS_READ);
  const canSettings = can(PERMISSION_CLUB_SETTINGS_READ);
  const canTournaments = can(PERMISSION_CLUB_TOURNAMENTS_READ);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<DomainReservation | null>(null);
  const [createSlot, setCreateSlot] = useState<ClubTodayTurn | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

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
    enabled: canRead && Boolean(clubId),
  });
  const tournamentsQuery = useQuery({
    queryKey: ["club-tournaments", clubId],
    queryFn: () => Api.TournamentService().list(clubId ?? undefined),
    enabled: canTournaments && Boolean(clubId),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["club-reservation-summary", clubId] });
    void queryClient.invalidateQueries({ queryKey: ["club-reservation-today", clubId] });
    void queryClient.invalidateQueries({ queryKey: ["court-reservations-pending", clubId] });
    void queryClient.invalidateQueries({ queryKey: ["club-fixed-count", clubId] });
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

  const upcoming = nextTournament(tournamentsQuery.data ?? []);
  const activeCourts = (courtsQuery.data ?? []).filter((court) => court.status === "active").length;

  return (
    <div className="space-y-6" data-testid="club-dashboard">
      <DashboardPageHeader firstName={player?.firstName ?? ""} />

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Accesos rápidos</h3>
        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <Button type="button" onClick={() => setCreating(true)}>
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

      {canRead ? (
        <>
          <section className="grid items-stretch gap-3 xl:grid-cols-3">
            <OccupancyCard
              summary={summaryQuery.data}
              isLoading={summaryQuery.isLoading}
              isError={summaryQuery.isError}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:h-full xl:grid-cols-1 xl:grid-rows-2">
              <FreeSlotsCard
                summary={summaryQuery.data}
                isLoading={summaryQuery.isLoading}
                isError={summaryQuery.isError}
                href={canCourts ? ROUTES.club.courts : undefined}
              />
              <IncomeCard
                summary={summaryQuery.data}
                isLoading={summaryQuery.isLoading}
                isError={summaryQuery.isError}
              />
            </div>
            <DashboardClubCard
              session={session}
              settings={settingsQuery.data}
              settingsLoading={canSettings && settingsQuery.isLoading}
              settingsError={settingsQuery.isError}
              canSeeSettings={canSettings}
              courts={{
                label: "Canchas",
                value: courtsQuery.data ? activeCourts : null,
                href: ROUTES.club.courts,
                isLoading: courtsQuery.isLoading,
                isError: courtsQuery.isError,
                hidden: !canCourts,
              }}
              clients={{
                label: "Clientes",
                value: clientsQuery.data?.totalItems ?? null,
                href: ROUTES.club.clients,
                isLoading: clientsQuery.isLoading,
                isError: clientsQuery.isError,
                hidden: !canClients,
              }}
              fixed={{
                label: "Fijos",
                value: fixedQuery.data?.seriesCount ?? null,
                href: ROUTES.club.fixedReservations,
                isLoading: fixedQuery.isLoading,
                isError: fixedQuery.isError,
                hidden: false,
              }}
              tournament={upcoming}
              tournamentLoading={tournamentsQuery.isLoading}
              tournamentError={tournamentsQuery.isError}
              showTournament={canTournaments}
              tournamentHref={upcoming ? ROUTES.club.tournamentDetail(upcoming.id) : undefined}
            />
          </section>

          <section className="grid items-start gap-3 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
              <DashboardPendingTray
                reservations={pendingQuery.data ?? []}
                isLoading={pendingQuery.isLoading}
                isError={pendingQuery.isError}
                canMutate={canWrite}
                viewAllTo={canCourts ? ROUTES.club.courts : undefined}
                onChanged={refresh}
              />
            </div>
            <DashboardOccupancyHelp onMore={() => setHelpOpen(true)} />
          </section>

          <DashboardTodayTurns
            turns={todayQuery.data ?? []}
            isLoading={todayQuery.isLoading}
            isError={todayQuery.isError}
            agendaTo={canCourts ? ROUTES.club.courts : undefined}
            onOpen={openTurn}
          />
          <OccupancyDetailDialog open={helpOpen} onOpenChange={setHelpOpen} />
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

function nextTournament(tournaments: Tournament[]): Tournament | null {
  const today = dayjs().startOf("day");
  return (
    tournaments
      .filter((tournament) => tournament.status !== "cancelled" && tournament.status !== "finished")
      .filter((tournament) => !tournament.endDate || !dayjs(tournament.endDate).isBefore(today, "day"))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null
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
