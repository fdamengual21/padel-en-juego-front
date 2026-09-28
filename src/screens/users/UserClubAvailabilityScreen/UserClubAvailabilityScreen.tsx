import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import { CalendarClock, ChevronLeft, CircleAlert } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { EmptyState } from "@/components/EmptyState";
import {
  CourtAgendaGrid,
  CourtAgendaMonthGrid,
  CourtAgendaToolbar,
  type CourtAgendaToolbarMode,
} from "@/components/schedule";
import { clubClosesNextDay, parseClockMinutes } from "@/lib/clubSchedule";
import type { PublicClubSlot } from "@/modules/clubs";
import {
  buildAgendaMonthGridDays,
  CALENDAR_AGENDA_WEEK_DAYS,
  rangeForAgendaView,
  startOfAgendaWeek,
} from "@/modules/schedule";
import { ROUTES } from "@/router/routes";
import PlayerReservationModal from "@/screens/users/components/PlayerReservationModal";
import ReserveIntentPanel from "@/screens/users/components/ReserveIntentPanel";
import PublicCourtCard from "./components/PublicCourtCard";
import DayFreeSlotsDialog from "./components/DayFreeSlotsDialog";
import {
  summarizeOpenDays,
  toDaySummaryEvent,
  toFreeSlotBlock,
  toFreeSlotListItem,
  slotEventId,
} from "./publicDayAvailability";

dayjs.locale("es");

export default function UserClubAvailabilityScreen() {
  const { clubId = "" } = useParams();
  const { isAuthenticated } = useMockSession();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<CourtAgendaToolbarMode>("week");
  const [cursorDate, setCursorDate] = useState<Dayjs>(() => {
    const raw = params.get("date");
    const parsed = raw ? dayjs(raw) : dayjs();
    return parsed.isValid() ? parsed : dayjs();
  });
  const [intent, setIntent] = useState<PublicClubSlot | "browse" | null>(null);
  const [listDate, setListDate] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["public-club", clubId],
    queryFn: () => Api.ClubService().getPublic(clubId),
    enabled: Boolean(clubId),
  });

  const club = detailQuery.data;
  const requestedCourtId = params.get("courtId");
  const courtFilter =
    club?.courts.some((court) => court.id === requestedCourtId) ? requestedCourtId : null;
  const visibleCourts = (club?.courts ?? []).filter(
    (court) => !courtFilter || court.id === courtFilter,
  );

  const scheduleTailMinutes = useMemo(() => {
    if (!club?.openTime || !club.closeTime || !clubClosesNextDay(club.openTime, club.closeTime)) {
      return 0;
    }
    return parseClockMinutes(club.closeTime) ?? 0;
  }, [club]);

  const range = useMemo(
    () => rangeForAgendaView(mode, cursorDate, { tailMinutes: scheduleTailMinutes }),
    [mode, cursorDate, scheduleTailMinutes],
  );

  const dayRange = useMemo(
    () => rangeForAgendaView("day", cursorDate, { tailMinutes: scheduleTailMinutes }),
    [cursorDate, scheduleTailMinutes],
  );

  const availabilityQuery = useQuery({
    queryKey: ["public-club-availability", clubId, range.from, range.to, courtFilter],
    queryFn: () =>
      Api.ClubService().listPublicAvailability(clubId, {
        from: range.from,
        to: range.to,
        courtId: courtFilter,
      }),
    enabled: Boolean(clubId) && Boolean(club),
  });

  useEffect(() => {
    setIntent(null);
    setListDate(null);
  }, [cursorDate, mode, courtFilter]);

  const openHours = useMemo(() => openHoursOf(club?.openTime, club?.closeTime, club?.openDays ?? []), [club]);

  const visibleDays = useMemo(() => {
    if (mode === "month") return buildAgendaMonthGridDays(cursorDate);
    if (mode === "day") return [cursorDate.startOf("day")];
    const start = startOfAgendaWeek(cursorDate);
    return Array.from({ length: CALENDAR_AGENDA_WEEK_DAYS }, (_, index) =>
      start.add(index, "day"),
    );
  }, [mode, cursorDate]);

  const daySummaries = useMemo(() => {
    if (!availabilityQuery.data || !club) return [];
    return summarizeOpenDays(
      visibleDays,
      availabilityQuery.data.slots,
      club.openDays,
      openHours.jornada,
    );
  }, [availabilityQuery.data, club, visibleDays, openHours.jornada]);

  const dayNotes = useMemo(() => {
    const notes: Record<string, { label: string; tone: "available" | "unavailable" }> = {};
    for (const summary of daySummaries) {
      notes[summary.dateKey] = { label: summary.label, tone: summary.tone };
    }
    return notes;
  }, [daySummaries]);

  const summaryEvents = useMemo(
    () => daySummaries.map(toDaySummaryEvent),
    [daySummaries],
  );

  const freeListEvents = useMemo(
    () => daySummaries.flatMap((summary) => summary.freeSlots.map(toFreeSlotListItem)),
    [daySummaries],
  );

  const freeBlockEvents = useMemo(
    () => daySummaries.flatMap((summary) => summary.freeSlots.map(toFreeSlotBlock)),
    [daySummaries],
  );

  const slotsById = useMemo(() => {
    const map = new Map<string, (typeof daySummaries)[number]["freeSlots"][number]>();
    for (const summary of daySummaries) {
      for (const slot of summary.freeSlots) map.set(slotEventId(slot), slot);
    }
    return map;
  }, [daySummaries]);

  const selectListedSlot = (eventId: string) => {
    const slot = slotsById.get(eventId);
    if (slot) setIntent(slot);
  };

  const listedDay = daySummaries.find((summary) => summary.dateKey === listDate) ?? null;

  const openDayList = (dateKey: string) => {
    const summary = daySummaries.find((item) => item.dateKey === dateKey);
    if (!summary || summary.freeSlots.length === 0) return;
    setListDate(dateKey);
  };

  const openEventDayList = (eventId: string) => {
    const summary = daySummaries.find((item) =>
      item.freeSlots.some((slot) => slotEventId(slot) === eventId),
    );
    if (summary) openDayList(summary.dateKey);
  };

  const bookableSlots = useMemo(
    () => (availabilityQuery.data?.slots ?? []).filter((slot) => slot.status === "free"),
    [availabilityQuery.data?.slots],
  );

  const freeToday = useMemo(() => {
    const now = Date.now();
    const from = dayjs(dayRange.from).valueOf();
    const to = dayjs(dayRange.to).valueOf();
    return (availabilityQuery.data?.slots ?? []).filter((slot) => {
      if (slot.status !== "free") return false;
      const start = dayjs(slot.startsAt).valueOf();
      const end = dayjs(slot.endsAt).valueOf();
      return start >= from && start < to && end > now;
    });
  }, [availabilityQuery.data?.slots, dayRange.from, dayRange.to]);

  return (
    <div className="space-y-5 p-4 md:p-0" data-testid="public-club-availability">
      <div className="space-y-1">
        <Link
          to={club ? ROUTES.player.clubDetail(club.id) : ROUTES.player.clubs}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {club?.name ?? "Club"}
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight">Disponibilidad</h2>
        <p className="text-sm text-muted-foreground">
          Cada día muestra cuántos turnos libres quedan. En rojo, ya no se puede reservar.
        </p>
      </div>

      {detailQuery.isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-muted" /> : null}

      {detailQuery.isError ? (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title={
            detailQuery.error instanceof Error
              ? detailQuery.error.message
              : "No se pudo cargar el club."
          }
        />
      ) : null}

      {club && visibleCourts.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Este club no tiene canchas activas."
        />
      ) : null}

      {club && visibleCourts.length > 0 ? (
        <>
          {intent && intent !== "browse" && isAuthenticated ? (
            <PlayerReservationModal
              clubId={club.id}
              courts={visibleCourts}
              slot={intent}
              freeSlots={bookableSlots}
              onClose={() => setIntent(null)}
            />
          ) : null}
          {intent && (intent === "browse" || !isAuthenticated) ? (
            <ReserveIntentPanel
              slot={intent === "browse" ? null : intent}
              onClose={() => setIntent(null)}
            />
          ) : null}

          <div className="space-y-4">
            {visibleCourts.map((court) => (
              <PublicCourtCard
                key={court.id}
                court={court}
                selectedDate={cursorDate}
                openTime={club.openTime}
                closeTime={club.closeTime}
                openDays={club.openDays}
                freeSlots={freeToday.filter((slot) => slot.courtId === court.id)}
                onSelectSlot={setIntent}
              />
            ))}
          </div>

          {!club.openTime || !club.closeTime ? (
            <p className="text-sm text-muted-foreground">El club no tiene horario de apertura.</p>
          ) : (
            <>
              <CourtAgendaToolbar
                mode={mode}
                date={cursorDate}
                onModeChange={setMode}
                onDateChange={setCursorDate}
              />
              {availabilityQuery.isError ? (
                <EmptyState
                  tone="error"
                  icon={CircleAlert}
                  title={
                    availabilityQuery.error instanceof Error
                      ? availabilityQuery.error.message
                      : "No se pudo cargar la disponibilidad."
                  }
                  className="min-h-40"
                />
              ) : mode === "month" ? (
                <CourtAgendaMonthGrid
                  selectedDate={cursorDate}
                  events={summaryEvents}
                  listEvents={freeListEvents}
                  loading={availabilityQuery.isLoading}
                  turnsLoading={availabilityQuery.isFetching}
                  jornada={openHours.jornada}
                  onSelectEvent={selectListedSlot}
                />
              ) : (
                <CourtAgendaGrid
                  viewMode={mode}
                  selectedDate={cursorDate}
                  events={freeBlockEvents}
                  loading={availabilityQuery.isLoading}
                  turnsLoading={availabilityQuery.isFetching}
                  openHour={openHours.openHour}
                  closeHour={openHours.closeHour}
                  jornada={openHours.jornada}
                  dayNotes={dayNotes}
                  onSelectEvent={openEventDayList}
                  onDayNoteClick={(day) => openDayList(day.format("YYYY-MM-DD"))}
                />
              )}
              <DayFreeSlotsDialog
                dateKey={listDate}
                slots={listedDay?.freeSlots ?? []}
                onClose={() => setListDate(null)}
                onSelect={(slot) => {
                  setListDate(null);
                  setIntent(slot);
                }}
              />
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

function openHoursOf(
  openTime: string | null | undefined,
  closeTime: string | null | undefined,
  openDays: readonly number[],
) {
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
    closeHour: closesNextDay ? 24 + closeHour + (closeMinutes % 60 > 0 ? 1 : 0) : closeHour,
    jornada: {
      openMinutes,
      closeMinutes,
      openDays,
    },
  };
}
