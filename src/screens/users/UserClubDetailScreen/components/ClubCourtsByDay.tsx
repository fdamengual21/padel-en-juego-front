import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import {
  ArrowUpRight,
  CalendarCheck,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
} from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { isCourtBookable, isCourtListedForPlayers, isoWeekdayFromDate } from "@/domain";
import { cn } from "@/lib/utils";
import type { PublicClubDetail, PublicClubSlot } from "@/modules/clubs";
import {
  CALENDAR_AGENDA_WEEK_DAYS,
  rangeForAgendaView,
  startOfAgendaWeek,
} from "@/modules/schedule";
import { ROUTES } from "@/router/routes";
import PlayerReservationModal from "@/screens/users/components/PlayerReservationModal";
import PublicCourtCard from "@/screens/users/components/PublicCourtCard";
import {
  publicAvailabilityQueryKey,
  publicClubHours,
  scheduleTailMinutes,
  summarizeOpenDays,
  type PublicDaySummary,
} from "@/screens/users/components/publicDayAvailability";
import ReserveIntentPanel from "@/screens/users/components/ReserveIntentPanel";

dayjs.locale("es");

interface ClubCourtsByDayProps {
  club: PublicClubDetail;
}

export default function ClubCourtsByDay({ club }: ClubCourtsByDayProps) {
  const { isAuthenticated } = useMockSession();
  const today = dayjs().startOf("day");
  const [selected, setSelected] = useState<Dayjs>(today);
  const [intent, setIntent] = useState<PublicClubSlot | null>(null);

  const hasSchedule = Boolean(club.openTime && club.closeTime);
  const courts = club.courts.filter((court) => isCourtListedForPlayers(court.status));
  const bookableCourts = courts.filter((court) => isCourtBookable(court.status));
  const tailMinutes = scheduleTailMinutes(club.openTime, club.closeTime);
  const range = useMemo(
    () => rangeForAgendaView("week", selected, { tailMinutes }),
    [selected, tailMinutes],
  );

  const query = useQuery({
    queryKey: publicAvailabilityQueryKey(club.id, range, null),
    queryFn: () =>
      Api.ClubService().listPublicAvailability(club.id, { from: range.from, to: range.to }),
    enabled: hasSchedule && courts.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const weekDays = useMemo(() => {
    const start = startOfAgendaWeek(selected).startOf("day");
    return Array.from({ length: CALENDAR_AGENDA_WEEK_DAYS }, (_, index) => start.add(index, "day"));
  }, [selected]);

  const weekLoading = query.isLoading || query.isPlaceholderData;
  const summaries = useMemo(() => {
    const map = new Map<string, PublicDaySummary>();
    if (!query.data || query.isPlaceholderData) return map;
    const hours = publicClubHours(club.openTime, club.closeTime, club.openDays);
    for (const summary of summarizeOpenDays(weekDays, query.data.slots, club.openDays, hours.jornada)) {
      map.set(summary.dateKey, summary);
    }
    return map;
  }, [query.data, query.isPlaceholderData, weekDays, club.openTime, club.closeTime, club.openDays]);

  const weekFreeSlots = useMemo(
    () => (query.data?.slots ?? []).filter((slot) => slot.status === "free"),
    [query.data?.slots],
  );

  const selectedKey = selected.format("YYYY-MM-DD");
  const selectedSummary = summaries.get(selectedKey);
  const selectedFree = selectedSummary?.freeSlots ?? [];
  const availabilityHref = `${ROUTES.player.clubAvailability(club.id)}?date=${selectedKey}`;

  return (
    <section className="space-y-4" data-testid="public-club-courts">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <CalendarCheck className="size-5 text-primary-strong" aria-hidden />
            Canchas y turnos
          </h3>
          <p className="text-xs text-muted-foreground">
            Elegí un día y un horario libre para pedir el turno.
          </p>
        </div>
        {hasSchedule && courts.length > 0 ? (
          <div className="flex items-center gap-1 self-start rounded-xl border border-border bg-card p-1 sm:self-auto">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Día anterior"
              disabled={!selected.isAfter(today, "day")}
              onClick={() => setSelected((day) => day.subtract(1, "day"))}
            >
              <ChevronLeft />
            </Button>
            <div className="min-w-36 px-2 text-center" aria-live="polite">
              <p className="text-xs font-semibold capitalize">{dayHeading(selected, today)}</p>
              <p className="text-[11px] font-medium text-muted-foreground">
                {weekLoading
                  ? "Buscando turnos…"
                  : selectedFree.length === 1
                    ? "1 turno libre"
                    : `${selectedFree.length} turnos libres`}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Día siguiente"
              onClick={() => setSelected((day) => day.add(1, "day"))}
            >
              <ChevronRight />
            </Button>
          </div>
        ) : null}
      </div>

      {!hasSchedule ? (
        <p className="text-sm text-muted-foreground">El club no tiene horario de apertura.</p>
      ) : courts.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Este club no tiene canchas activas." />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2" data-testid="public-club-week-strip">
            {weekDays.map((day) => {
              const key = day.format("YYYY-MM-DD");
              const isPast = day.isBefore(today, "day");
              const isSelected = key === selectedKey;
              const opens = club.openDays.includes(isoWeekdayFromDate(day.toDate()));
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isPast}
                  aria-pressed={isSelected}
                  onClick={() => setSelected(day)}
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center transition-colors",
                    isSelected
                      ? "border-primary bg-primary/15"
                      : "border-border bg-card hover:bg-muted",
                    isPast && "cursor-not-allowed opacity-50 hover:bg-card",
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                    {day.format("ddd")}
                  </span>
                  <span className="text-base font-bold tabular-nums">{day.format("D")}</span>
                  <DayChip
                    opens={opens}
                    loading={weekLoading}
                    summary={summaries.get(key)}
                  />
                </button>
              );
            })}
          </div>

          {query.isError && !query.data ? (
            <EmptyState
              tone="error"
              icon={CircleAlert}
              title={
                query.error instanceof Error
                  ? query.error.message
                  : "No se pudo cargar la disponibilidad."
              }
              className="min-h-40"
            />
          ) : query.isLoading ? (
            <div className="space-y-3" role="status" aria-label="Cargando turnos">
              {courts.slice(0, 2).map((court) => (
                <div key={court.id} className="h-48 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : (
            <div
              className={cn("space-y-3 transition-opacity", weekLoading && "opacity-60")}
              aria-busy={weekLoading}
            >
              {courts.map((court) => (
                <PublicCourtCard
                  key={court.id}
                  court={court}
                  selectedDate={selected}
                  openTime={club.openTime}
                  closeTime={club.closeTime}
                  openDays={club.openDays}
                  freeSlots={selectedFree.filter((slot) => slot.courtId === court.id)}
                  onSelectSlot={setIntent}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5 shrink-0" aria-hidden />
              Mostramos si el turno está libre u ocupado, sin decir quién lo reservó.
            </p>
            <Link
              to={availabilityHref}
              className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
            >
              Ver calendario completo
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </>
      )}

      {intent && isAuthenticated ? (
        <PlayerReservationModal
          clubId={club.id}
          courts={bookableCourts}
          slot={intent}
          freeSlots={weekFreeSlots}
          onClose={() => setIntent(null)}
        />
      ) : null}
      {intent && !isAuthenticated ? (
        <ReserveIntentPanel slot={intent} onClose={() => setIntent(null)} />
      ) : null}
    </section>
  );
}

function DayChip({
  opens,
  loading,
  summary,
}: {
  opens: boolean;
  loading: boolean;
  summary: PublicDaySummary | undefined;
}) {
  if (!opens) {
    return <span className="text-[10px] font-medium text-muted-foreground">Cerrado</span>;
  }
  if (loading) {
    return <span className="h-4 w-10 animate-pulse rounded bg-muted" aria-hidden />;
  }
  const free = summary?.freeSlots.length ?? 0;
  if (free === 0) {
    return (
      <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
        Sin turnos
      </span>
    );
  }
  return (
    <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
      {free} {free === 1 ? "libre" : "libres"}
    </span>
  );
}

function dayHeading(day: Dayjs, today: Dayjs): string {
  const date = day.format("ddd D [de] MMM");
  if (day.isSame(today, "day")) return `Hoy, ${date}`;
  if (day.isSame(today.add(1, "day"), "day")) return `Mañana, ${date}`;
  return date;
}
