import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import type {
  Client,
  Club,
  Court,
  CourtAgendaEvent,
  CourtAvailableSlot,
  CourtDayOverviewItem,
  CourtDaySummary,
  CourtReservation,
} from "@/domain";
import { COURT_STATUS_LABELS, isoWeekdayFromDate, listDayPriceRanges } from "@/domain";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  mapCourtAgendaEventToGridItem,
  rangeForAgendaView,
  startOfAgendaWeek,
  type CalendarEventGridItemDto,
} from "@/modules/schedule";
import {
  clubClosesNextDay,
  parseClockMinutes,
} from "@/lib/clubSchedule";
import { cn } from "@/lib/utils";
import {
  isClubOperatingOnDate,
  listOperatingSlots,
  resolveClubOpenStatus,
} from "@/utils";
import type { ClubSession } from "@/stores/clubSessionStore";
import {
  CourtAgendaGrid,
  CourtAgendaMonthGrid,
  CourtAgendaToolbar,
  type CourtAgendaToolbarMode,
} from "@/components/schedule";
import CourtReservationModal from "./components/CourtReservationModal";
import DashboardPendingTray from "@/screens/club/components/ClubPendingTray";
import CourtSummaryCard from "./components/CourtSummaryCard";
import CourtsOverviewCard from "./components/CourtsOverviewCard";
import CreateCourtDialog from "./components/CreateCourtDialog";
import { Plus } from "lucide-react";
import { useClubSession } from "@/hooks/useClubSession";
import { ROUTES } from "@/router/routes";
import { usePermissions } from "@/authorization";
import {
  PERMISSION_CLUB_COURTS_READ,
  PERMISSION_CLUB_COURTS_WRITE,
  PERMISSION_CLUB_RESERVATIONS_READ,
  PERMISSION_CLUB_RESERVATIONS_WRITE,
} from "@/authorization/permissionCodes";
import { PermissionsGuard } from "@/components/guards";

dayjs.locale("es");

type CourtsHeaderView = "overview" | "detail";

function clubViewFromSettings(
  clubId: string,
  fallbackName: string,
  settings:
    | {
        name: string;
        isActive: boolean;
        openTime: string | null;
        closeTime: string | null;
        openDays: Club["openDays"];
      }
    | undefined,
): Club {
  return {
    id: clubId,
    name: settings?.name ?? fallbackName,
    status: settings?.isActive === false ? "inactive" : "active",
    province: null,
    city: null,
    openTime: settings?.openTime ?? "08:00",
    closeTime: settings?.closeTime ?? "23:00",
    openDays: settings?.openDays ?? [],
    createdAt: "",
    updatedAt: "",
  };
}

function priceBandsForDate(court: Court, date: string, session: ClubSession | null) {
  const weekday = isoWeekdayFromDate(new Date(`${date}T12:00:00`));
  return listDayPriceRanges({
    ...scheduleOf(session),
    weekday,
    basePrice: court.basePrice,
    rules: court.priceRules ?? [],
  });
}

function scheduleOf(session: ClubSession | null) {
  return {
    openTime: session?.openTime ?? null,
    closeTime: session?.closeTime ?? null,
    openDays: session?.openDays ?? [],
  };
}

function slotsMessage(
  court: Court,
  date: string,
  session: ClubSession | null,
  slotCount: number,
): string {
  if (!session) return "Cargando horario…";
  if (court.status === "inactive") return "Cancha inactiva.";
  if (court.status === "comingSoon") return "Próximamente.";
  if (court.status === "maintenance") return "En mantenimiento.";
  if (!session.openTime || !session.closeTime || session.openDays.length === 0) {
    return "Sin horario del club.";
  }
  if (!isClubOperatingOnDate({ ...scheduleOf(session), date })) {
    return "El club no abre este día.";
  }
  if (slotCount === 0) return "Sin turnos en este horario.";
  return "";
}

function daySummaryFromCourt(
  court: Court,
  date: string,
  session: ClubSession | null,
): CourtDaySummary {
  const priceBands = priceBandsForDate(court, date, session);
  const schedule = scheduleOf(session);
  const availableSlots =
    session && court.status === "active"
      ? listOperatingSlots({
          ...schedule,
          date,
          slotDurationMinutes: court.slotDurationMinutes,
        })
      : [];
  const clubOpen =
    session != null &&
    resolveClubOpenStatus({ ...schedule, at: new Date() }) === "open";
  return {
    date,
    totalSlots: availableSlots.length,
    occupiedSlots: 0,
    freeSlots: availableSlots.length,
    nextFreeAt: availableSlots[0]?.startsAt ?? null,
    minPrice: priceBands.length
      ? Math.min(court.basePrice, ...priceBands.map((band) => band.price))
      : court.basePrice,
    message: slotsMessage(court, date, session, availableSlots.length),
    priceBands,
    availableSlots,
    liveStatus: clubOpen ? "available" : "closed",
  };
}

function overviewFromCourts(
  courts: Court[],
  date: string,
  session: ClubSession | null,
): CourtDayOverviewItem[] {
  return courts.map((court) => {
    const summary = daySummaryFromCourt(court, date, session);
    return {
      court,
      date,
      liveStatus: summary.liveStatus,
      freeSlots: summary.freeSlots,
      totalSlots: summary.totalSlots,
      nextFreeAt: summary.nextFreeAt,
      minPrice: summary.minPrice,
      priceBands: summary.priceBands,
      availableSlots: summary.availableSlots,
      message: summary.message,
    };
  });
}

interface ReservationModalState {
  mode: "view" | "edit" | "create";
  event: CourtAgendaEvent | null;
  reservation: CourtReservation | null;
  client: Client | null;
  presetStartsAt: string | null;
  /** Fecha de la jornada que se está viendo. */
  initialDate: string | null;
  /** True solo si se abrió desde un chip de turno. */
  preselectSlot: boolean;
  courtId: string | null;
}

function reservationToGridEvent(
  item: CourtReservation,
  hidePlayers: boolean,
): CalendarEventGridItemDto {
  const player = [item.playerFirstName, item.playerLastName].filter(Boolean).join(" ");
  const title = item.isTournamentBlock
    ? player || "Torneo"
    : hidePlayers
      ? "Ocupado"
      : player || "Turno";
  return {
    id: item.id,
    type: "reservation",
    title,
    subtitle: item.isFixed
      ? `Fijo · ${item.courtName ?? ""}`.replace(/\s·\s$/, "")
      : (item.courtName ?? null),
    startAt: item.startsAt,
    endAt: item.endsAt,
    allDay: false,
    status:
      item.status === "completed"
        ? "Completed"
        : item.status === "pending"
          ? "Pending"
          : "Booked",
  };
}

export default function ClubCourtsScreen() {
  const { session: clubSession } = useClubSession();
  const { clubId } = useMockSession();
  const clubName = useAuthStore(
    (state) =>
      state.user?.clubs.find((club) => club.id === clubId)?.name ?? "Club",
  );
  const { can } = usePermissions();
  const navigate = useNavigate();
  const canWriteReservations = can(PERMISSION_CLUB_RESERVATIONS_WRITE);
  const canSeeReservationDetail = can(PERMISSION_CLUB_RESERVATIONS_READ);
  const canOpenCourtConfig = can(PERMISSION_CLUB_COURTS_READ);
  const queryClient = useQueryClient();
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [headerView, setHeaderView] = useState<CourtsHeaderView>("overview");
  const [mode, setMode] = useState<CourtAgendaToolbarMode>("week");
  const [cursorDate, setCursorDate] = useState<Dayjs>(() => dayjs());
  const [createCourtOpen, setCreateCourtOpen] = useState(false);
  const [reservationModal, setReservationModal] =
    useState<ReservationModalState | null>(null);

  const summaryDate = cursorDate.format("YYYY-MM-DD");

  const courtsQuery = useQuery({
    queryKey: ["courts", clubId],
    queryFn: () => Api.CourtService().list(),
    enabled: Boolean(clubId),
  });

  const courts = courtsQuery.data ?? [];

  const scheduleTailMinutes = useMemo(() => {
    const openTime = clubSession?.openTime;
    const closeTime = clubSession?.closeTime;
    if (!openTime || !closeTime || !clubClosesNextDay(openTime, closeTime)) {
      return 0;
    }
    return parseClockMinutes(closeTime) ?? 0;
  }, [clubSession]);

  const range = useMemo(
    () =>
      rangeForAgendaView(mode, cursorDate, {
        tailMinutes: scheduleTailMinutes,
      }),
    [mode, cursorDate, scheduleTailMinutes],
  );

  const activeCourtId = selectedCourtId ?? courts[0]?.id ?? null;

  const boardQuery = useQuery({
    queryKey: [
      "court-agenda-board",
      clubId,
      activeCourtId,
      range.from,
      range.to,
      summaryDate,
    ],
    enabled: Boolean(activeCourtId) && headerView === "detail",
    queryFn: () =>
      Api.TournamentOpsService().getCourtAgendaBoard(clubId, activeCourtId!, {
        from: range.from,
        to: range.to,
        summaryDate,
      }),
  });

  const multiBoardQuery = useQuery({
    queryKey: ["courts-agenda-board", clubId, range.from, range.to],
    queryFn: () =>
      Api.TournamentOpsService().getCourtsAgendaBoard(clubId, {
        from: range.from,
        to: range.to,
      }),
    enabled: headerView === "overview" && Boolean(clubId),
  });

  const board = boardQuery.data;
  const multiBoard = multiBoardQuery.data;
  const court =
    courts.find((c) => c.id === activeCourtId) ??
    board?.court ??
    null;
  const modalCourtId =
    reservationModal?.courtId ?? reservationModal?.event?.courtId ?? null;
  const courtsForModal =
    multiBoard?.courts && multiBoard.courts.length > 0
      ? multiBoard.courts
      : courts;

  const gridEvents = useMemo(
    () => (board?.events ?? []).map((event) => mapCourtAgendaEventToGridItem(event)),
    [board?.events],
  );

  const overviewGridEvents = useMemo(() => {
    const courtNames = new Map(
      (multiBoard?.courts ?? courts).map((c) => [c.id, c.name] as const),
    );
    return (multiBoard?.events ?? []).map((event) =>
      mapCourtAgendaEventToGridItem(event, {
        courtName: courtNames.get(event.courtId) ?? null,
      }),
    );
  }, [multiBoard?.events, multiBoard?.courts, courts]);

  const openHours = useMemo(() => {
    const openTime =
      clubSession?.openTime ||
      (headerView === "overview" ? multiBoard?.openTime : board?.club.openTime) ||
      null;
    const closeTime =
      clubSession?.closeTime ||
      (headerView === "overview" ? multiBoard?.closeTime : board?.club.closeTime) ||
      null;
    const openDays = clubSession?.openDays?.length
      ? clubSession.openDays
      : (board?.club.openDays ?? []);
    if (!openTime || !closeTime) {
      return {
        openHour: undefined as number | undefined,
        closeHour: undefined as number | undefined,
        jornada: undefined,
      };
    }
    const openHour = Number(openTime.slice(0, 2)) || 0;
    const closeHour = Number(closeTime.slice(0, 2)) || 0;
    const openMinutes = parseClockMinutes(openTime) ?? openHour * 60;
    const closeMinutes = parseClockMinutes(closeTime) ?? closeHour * 60;
    const closesNextDay = closeMinutes < openMinutes;
    return {
      openHour,
      closeHour: closesNextDay
        ? 24 + closeHour + (closeMinutes % 60 > 0 ? 1 : 0)
        : closeHour,
      jornada: {
        openMinutes,
        closeMinutes,
        openDays,
      },
    };
  }, [headerView, multiBoard, board, clubSession]);

  const eventsById = useMemo(() => {
    const map = new Map<string, CourtAgendaEvent>();
    const source =
      headerView === "overview"
        ? (multiBoard?.events ?? [])
        : (board?.events ?? []);
    for (const event of source) {
      map.set(event.id, event);
    }
    return map;
  }, [headerView, multiBoard?.events, board?.events]);

  const invalidateBoard = () => {
    void queryClient.invalidateQueries({ queryKey: ["court-agenda-board"] });
    void queryClient.invalidateQueries({ queryKey: ["courts-agenda-board"] });
    void queryClient.invalidateQueries({ queryKey: ["courts-day-overview"] });
    void queryClient.invalidateQueries({ queryKey: ["court-reservations"] });
    void queryClient.invalidateQueries({ queryKey: ["court-reservations-pending"] });
    void queryClient.invalidateQueries({ queryKey: ["court-reservations-calendar"] });
    void queryClient.invalidateQueries({ queryKey: ["court-slots"] });
    void queryClient.invalidateQueries({ queryKey: ["courts", clubId] });
  };

  const openCreate = (targetCourtId: string | null, day: Dayjs) => {
    if (!canWriteReservations) return;
    const courtId =
      targetCourtId ??
      courts.find((court) => court.status === "active")?.id ??
      courts[0]?.id ??
      null;
    if (courtId) setSelectedCourtId(courtId);
    setReservationModal({
      mode: "create",
      event: null,
      reservation: null,
      client: null,
      presetStartsAt: null,
      initialDate: day.format("YYYY-MM-DD"),
      preselectSlot: false,
      courtId,
    });
  };

  const openEvent = async (eventId: string, courtIdHint?: string) => {
    const event = eventsById.get(eventId);
    if (!event) return;
    const courtId = courtIdHint ?? event.courtId;
    setSelectedCourtId(courtId);

    if (event.kind === "tournament_match") {
      setReservationModal({
        mode: "view",
        event,
        reservation: null,
        client: null,
        presetStartsAt: null,
        initialDate: null,
        preselectSlot: false,
        courtId,
      });
      return;
    }
    if (!event.reservationId) return;

    const reservations = await Api.TournamentOpsService().listCourtReservations(
      clubId,
      {
        courtId,
        from: startOfAgendaWeek(cursorDate).toISOString(),
        to: startOfAgendaWeek(cursorDate).add(8, "day").toISOString(),
      },
    );
    const reservation =
      reservations.find((item) => item.id === event.reservationId) ?? null;
    let client: Client | null = null;
    if (event.clientId) {
      const detail = await Api.TournamentOpsService().getClubClientDetail(
        clubId,
        event.clientId,
      );
      client = detail?.client ?? null;
    }
    setReservationModal({
      mode: "view",
      event,
      reservation,
      client,
      presetStartsAt: null,
      initialDate: null,
      preselectSlot: false,
      courtId,
    });
  };

  const clubView = clubViewFromSettings(clubId, clubName, clubSession
    ? {
        name: clubSession.name,
        isActive: clubSession.isActive,
        openTime: clubSession.openTime,
        closeTime: clubSession.closeTime,
        openDays: clubSession.openDays,
      }
    : undefined);
  const suggestedCourtName = `Cancha ${courts.length + 1}`;
  const slotsQuery = useQuery({
    queryKey: ["court-slots", clubId, summaryDate],
    queryFn: () => Api.ReservationService().listSlots(summaryDate),
    enabled: Boolean(clubId),
  });

  const pendingReservationsQuery = useQuery({
    queryKey: ["court-reservations-pending", clubId],
    queryFn: () => Api.ReservationService().listPending(),
    enabled: Boolean(clubId) && canSeeReservationDetail,
  });

  const calendarCourtId = headerView === "detail" ? activeCourtId : null;
  const calendarReservationsQuery = useQuery({
    queryKey: ["court-reservations-calendar", clubId, range.from, range.to, calendarCourtId],
    queryFn: () =>
      Api.ReservationService().listCalendar(
        range.from,
        range.to,
        calendarCourtId ?? undefined,
      ),
    enabled: Boolean(clubId) && (headerView !== "detail" || Boolean(activeCourtId)),
    placeholderData: keepPreviousData,
  });

  const reservationGridEvents = useMemo(
    () =>
      (calendarReservationsQuery.data ?? []).map((item) =>
        reservationToGridEvent(item, !canSeeReservationDetail),
      ),
    [calendarReservationsQuery.data, canSeeReservationDetail],
  );

  const openReservation = (reservation: CourtReservation) => {
    setSelectedCourtId(reservation.courtId);
    setReservationModal({
      mode: "view",
      event: null,
      reservation,
      client: null,
      presetStartsAt: null,
      initialDate: null,
      preselectSlot: false,
      courtId: reservation.courtId,
    });
  };

  const openChip = (courtId: string, slot: CourtAvailableSlot) => {
    if (slot.status === "pending" && slot.reservationId) {
      const reservation = (pendingReservationsQuery.data ?? []).find(
        (item) => item.id === slot.reservationId,
      );
      if (reservation) {
        openReservation(reservation);
        return;
      }
    }
    setSelectedCourtId(courtId);
    setReservationModal({
      mode: "create",
      event: null,
      reservation: null,
      client: null,
      presetStartsAt: slot.startsAt,
      initialDate: summaryDate,
      preselectSlot: true,
      courtId,
    });
  };

  const openGridEvent = (eventId: string, courtIdHint?: string) => {
    const reservation = (calendarReservationsQuery.data ?? []).find(
      (item) => item.id === eventId,
    );
    if (reservation?.isTournamentBlock) return;
    if (!canSeeReservationDetail) return;
    if (reservation?.isFixed) {
      navigate(ROUTES.club.fixedReservations);
      return;
    }
    if (reservation) {
      openReservation(reservation);
      return;
    }
    void openEvent(eventId, courtIdHint);
  };

  const overviewItems = overviewFromCourts(courts, summaryDate, clubSession).map(
    (item) => {
      if (!slotsQuery.data) return item;
      const availableSlots = slotsQuery.data.slots
        .filter((slot) => slot.courtId === item.court.id)
        .map((slot) => ({
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          label: slot.label,
          status: slot.status,
          reservationId: slot.reservationId,
        }));
      return {
        ...item,
        availableSlots,
        freeSlots: availableSlots.length,
        totalSlots: availableSlots.length,
        nextFreeAt: availableSlots[0]?.startsAt ?? null,
      };
    },
  );

  return (
    <div className="space-y-5" data-testid="club-courts">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Canchas</h2>
          <p className="text-base text-muted-foreground">
            {canWriteReservations || canOpenCourtConfig
              ? "Agenda, reservas y configuración por cancha."
              : "Agenda del club para ver disponibilidad."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-border p-0.5"
            data-testid="courts-header-view-toggle"
          >
            {(
              [
                { value: "overview", label: "Todas" },
                { value: "detail", label: "Detalle" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  headerView === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setHeaderView(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {headerView === "detail" ? (
            <>
              <label
                className="text-base text-muted-foreground"
                htmlFor="court-select"
              >
                Cancha
              </label>
              <select
                id="court-select"
                className="h-10 min-w-44 rounded-lg border border-input bg-transparent px-3 text-base"
                value={activeCourtId ?? ""}
                onChange={(e) => setSelectedCourtId(e.target.value)}
                disabled={courts.length === 0}
              >
                {courts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.status !== "active" ? ` (${COURT_STATUS_LABELS[item.status]})` : ""}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          <PermissionsGuard permission={PERMISSION_CLUB_COURTS_WRITE}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateCourtOpen(true)}
            >
              <Plus className="size-4" />
              Agregar cancha
            </Button>
          </PermissionsGuard>
        </div>
      </div>

      {courts.length === 0 && !courtsQuery.isLoading ? (
        <div className="space-y-3 rounded-xl border border-dashed border-border p-6">
          <p className="text-base text-muted-foreground">
            No hay canchas en este club.
          </p>
          <PermissionsGuard permission={PERMISSION_CLUB_COURTS_WRITE}>
            <Button type="button" onClick={() => setCreateCourtOpen(true)}>
              <Plus className="size-4" />
              Agregar cancha
            </Button>
          </PermissionsGuard>
        </div>
      ) : headerView === "overview" ? (
        courtsQuery.isLoading ? (
          <p className="text-base text-muted-foreground">Cargando canchas…</p>
        ) : (
          <CourtsOverviewCard
            items={overviewItems}
            onSelectSlot={canWriteReservations ? openChip : undefined}
            onOpenDetail={(courtId) => {
              setSelectedCourtId(courtId);
              setHeaderView("detail");
            }}
          />
        )
      ) : court ? (
        <CourtSummaryCard
          club={clubView}
          court={court}
          daySummary={(() => {
            const summary = daySummaryFromCourt(court, summaryDate, clubSession);
            if (!slotsQuery.data) return summary;
            const availableSlots = slotsQuery.data.slots
              .filter((slot) => slot.courtId === court.id)
              .map((slot) => ({
                startsAt: slot.startsAt,
                endsAt: slot.endsAt,
                label: slot.label,
                status: slot.status,
                reservationId: slot.reservationId,
              }));
            return {
              ...summary,
              availableSlots,
              freeSlots: availableSlots.length,
              totalSlots: availableSlots.length,
              nextFreeAt: availableSlots[0]?.startsAt ?? null,
            };
          })()}
          onConfigure={
            canOpenCourtConfig
              ? () => navigate(ROUTES.club.courtConfig(court.id))
              : undefined
          }
          onSelectSlot={
            canWriteReservations
              ? (slot) => openChip(court.id, slot)
              : undefined
          }
        />
      ) : courtsQuery.isLoading ? (
        <p className="text-base text-muted-foreground">Cargando canchas…</p>
      ) : null}

      {canSeeReservationDetail ? (
        <DashboardPendingTray
          reservations={pendingReservationsQuery.data ?? []}
          isLoading={pendingReservationsQuery.isLoading}
          isError={pendingReservationsQuery.isError}
          canMutate={canWriteReservations}
          onChanged={invalidateBoard}
        />
      ) : null}

      {courts.length > 0 ? (
        <>
          <CourtAgendaToolbar
            mode={mode}
            date={cursorDate}
            onModeChange={setMode}
            onDateChange={setCursorDate}
            onAddReservation={
              canWriteReservations
                ? () => {
                    const defaultCourtId =
                      headerView === "detail" ? activeCourtId : null;
                    setReservationModal({
                      mode: "create",
                      event: null,
                      reservation: null,
                      client: null,
                      presetStartsAt: null,
                      initialDate: summaryDate,
                      preselectSlot: false,
                      courtId: defaultCourtId,
                    });
                  }
                : undefined
            }
          />

          {mode === "month" && (headerView === "overview" || court) ? (
            <CourtAgendaMonthGrid
              selectedDate={cursorDate}
              events={
                headerView === "overview"
                  ? [...overviewGridEvents, ...reservationGridEvents]
                  : [...gridEvents, ...reservationGridEvents]
              }
              loading={
                headerView === "overview" ? multiBoardQuery.isLoading : boardQuery.isLoading
              }
              turnsLoading={calendarReservationsQuery.isFetching}
              jornada={openHours.jornada}
              onSelectEvent={(eventId) => {
                openGridEvent(eventId, headerView === "detail" ? court?.id : undefined);
              }}
              onEmptyDayClick={
                canWriteReservations
                  ? (day) => openCreate(headerView === "detail" ? court?.id ?? null : null, day)
                  : undefined
              }
            />
          ) : headerView === "overview" ? (
            <CourtAgendaGrid
              viewMode={mode}
              selectedDate={cursorDate}
              events={[...overviewGridEvents, ...reservationGridEvents]}
              loading={multiBoardQuery.isLoading}
              turnsLoading={calendarReservationsQuery.isFetching}
              openHour={openHours.openHour}
              closeHour={openHours.closeHour}
              jornada={openHours.jornada}
              onSelectEvent={(eventId) => {
                openGridEvent(eventId);
              }}
              onEmptySlotClick={
                canWriteReservations
                  ? (day, hour) => {
                      openCreate(null, day);
                    }
                  : undefined
              }
            />
          ) : court ? (
            <CourtAgendaGrid
              viewMode={mode}
              selectedDate={cursorDate}
              events={[...gridEvents, ...reservationGridEvents]}
              loading={boardQuery.isLoading}
              turnsLoading={calendarReservationsQuery.isFetching}
              openHour={openHours.openHour}
              closeHour={openHours.closeHour}
              jornada={openHours.jornada}
              onSelectEvent={(eventId) => {
                openGridEvent(eventId, court.id);
              }}
              onEmptySlotClick={
                canWriteReservations
                  ? (day) => openCreate(court.id, day)
                  : undefined
              }
            />
          ) : null}
        </>
      ) : null}

      <CreateCourtDialog
        open={createCourtOpen}
        suggestedName={suggestedCourtName}
        onOpenChange={setCreateCourtOpen}
        onCreated={(courtId) => {
          setSelectedCourtId(courtId);
          setHeaderView("detail");
          invalidateBoard();
        }}
      />

      {reservationModal ? (
        <CourtReservationModal
          open
          clubId={clubId}
          courts={courtsForModal}
          initialCourtId={modalCourtId}
          mode={reservationModal.mode}
          presetStartsAt={reservationModal.presetStartsAt}
          initialDate={reservationModal.initialDate}
          preselectSlot={reservationModal.preselectSlot}
          event={reservationModal.event}
          reservation={reservationModal.reservation}
          client={reservationModal.client}
          canMutate={canWriteReservations}
          onOpenChange={(open) => {
            if (!open) setReservationModal(null);
          }}
          onSaved={invalidateBoard}
        />
      ) : null}
    </div>
  );
}
