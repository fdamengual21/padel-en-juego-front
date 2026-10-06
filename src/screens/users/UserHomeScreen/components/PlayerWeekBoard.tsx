import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { Calendar, ChevronRight } from "lucide-react";
import { useState } from "react";
import { PlayerReservationStatusChip } from "@/components/reservations";
import { Badge } from "@/components/ui/badge";
import type { PlayerWeekEvent } from "@/domain";
import { ROUTES } from "@/router/routes";
import type { PlayerReservation } from "@/modules/reservations";

interface PlayerWeekBoardProps {
  reservations: PlayerReservation[];
  events: PlayerWeekEvent[];
  loading: boolean;
  onOpenReservation: (reservation: PlayerReservation) => void;
}

/** Un ítem. Todas las columnas miden esto mientras están quietas. */
const collapsedListClass = "max-h-[3.625rem]";

type Slot =
  | { kind: "reservation"; at: number; reservation: PlayerReservation }
  | { kind: "event"; at: number; event: PlayerWeekEvent };

export default function PlayerWeekBoard({
  reservations,
  events,
  loading,
  onOpenReservation,
}: PlayerWeekBoardProps) {
  const days = groupByDay(reservations, events);
  const count = days.reduce((total, day) => total + day.slots.length, 0);

  return (
    <div className="space-y-3" data-testid="player-week">
      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Calendar className="size-4" aria-hidden />
        </span>
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Partidos/reservas en los próximos 7 días</h3>
        {!loading ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-success px-1.5 text-[11px] font-semibold leading-none text-white tabular-nums">
            {count}
          </span>
        ) : null}
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando la semana…</p>
      ) : (
        <div className="flex items-start overflow-x-auto pb-1 pl-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map((day, index) => (
            <div key={day.key} className="flex shrink-0 items-start">
              {index > 0 ? (
                <div aria-hidden className="relative w-3 self-stretch">
                  <span className="absolute top-[22px] right-0 left-0 h-px -translate-y-1/2 bg-muted-foreground/35" />
                </div>
              ) : null}
              <div className="relative w-72">
                <span
                  aria-hidden
                  className="absolute top-[22px] left-0 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/45"
                />
                <DayColumn day={day} onOpenReservation={onOpenReservation} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DayColumn({
  day,
  onOpenReservation,
}: {
  day: DayGroup;
  onOpenReservation: (reservation: PlayerReservation) => void;
}) {
  const [pinned, setPinned] = useState(false);
  const isToday = day.date.isSame(dayjs(), "day");
  const canExpand = day.slots.length > 1;
  return (
    <article
      data-open={pinned ? "true" : undefined}
      className={`group/day relative flex w-72 shrink-0 flex-col gap-2 rounded-xl border p-3 transition-shadow duration-500 ease-out hover:z-20 focus-within:z-20 data-[open=true]:z-20 hover:shadow-sm focus-within:shadow-sm data-[open=true]:shadow-sm ${isToday ? "border-success/40 bg-success/5" : "border-border bg-card"
        }`}
      data-testid={`player-week-day-${day.key}`}
    >
      <header>
        <button
          type="button"
          className="w-full text-left"
          aria-expanded={canExpand ? pinned : undefined}
          onClick={() => {
            if (canExpand) setPinned((open) => !open);
          }}
        >
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold capitalize tracking-tight">
              {isToday ? "Hoy" : day.date.format("dddd")}
            </p>
            {day.slots.length > 0 ? (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-success px-1 text-[10px] font-semibold leading-none text-white tabular-nums">
                {day.slots.length}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{day.date.format("D MMM").replace(".", "")}</p>
        </button>
      </header>
      {day.slots.length === 0 ? (
        <div className="flex h-[3.625rem] items-center justify-center">
          <p className="text-center text-xs text-muted-foreground">Sin turnos programados</p>
        </div>
      ) : (
        <ul
          className={`flex flex-col gap-2 overflow-hidden overscroll-contain transition-[max-height] duration-500 ease-out ${collapsedListClass} group-hover/day:max-h-[calc(3.625rem*4+0.5rem*3)] group-hover/day:overflow-y-auto group-focus-within/day:max-h-[calc(3.625rem*4+0.5rem*3)] group-focus-within/day:overflow-y-auto group-data-[open=true]/day:max-h-[calc(3.625rem*4+0.5rem*3)] group-data-[open=true]/day:overflow-y-auto`}
        >
          {day.slots.map((slot) =>
            slot.kind === "reservation" ? (
              <ReservationRow
                key={`reservation-${slot.reservation.id}`}
                reservation={slot.reservation}
                onOpen={onOpenReservation}
              />
            ) : (
              <EventRow key={`${slot.event.kind}-${slot.event.id}`} event={slot.event} />
            ),
          )}
        </ul>
      )}
    </article>
  );
}

function ReservationRow({
  reservation,
  onOpen,
}: {
  reservation: PlayerReservation;
  onOpen: (reservation: PlayerReservation) => void;
}) {
  const image = reservation.courtImageUrl ?? reservation.club.avatarUrl ?? reservation.club.coverUrl;
  const court = reservation.courtName || "Cancha";
  return (
    <li>
      <button
        type="button"
        className="flex h-[3.625rem] w-full shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card p-2 text-left"
        onClick={() => onOpen(reservation)}
      >
        <Thumb src={image} label={reservation.club.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold tabular-nums">{clock(reservation.startsAt)}</p>
            <PlayerReservationStatusChip
              status={reservation.status}
              isFixed={reservation.isFixed}
              withIcon={false}
              className="h-4 px-1 py-0 text-[10px] leading-none"
            />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {reservation.club.name} · {court}
          </p>
        </div>
      </button>
    </li>
  );
}

function EventRow({ event }: { event: PlayerWeekEvent }) {
  const title = event.kind === "match" ? (event.detail ?? "Partido") : event.tournamentName;
  const place = [event.clubName, event.courtName].filter(Boolean).join(" · ");
  return (
    <li>
      <Link
        to={ROUTES.player.tournamentDetail(event.tournamentId)}
        className="flex h-[3.625rem] shrink-0 items-center gap-2 rounded-lg border border-border bg-card p-2"
      >
        <Thumb src={event.imageUrl} label={event.clubName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold tabular-nums">{clock(event.startsAt)}</p>
            {event.phaseLabel ? (
              <Badge
                variant="secondary"
                className="h-4 border-transparent! bg-muted! px-1 py-0 text-[10px] leading-none font-medium text-muted-foreground"
              >
                {event.phaseLabel}
              </Badge>
            ) : null}
          </div>
          <p className="truncate text-xs font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{place}</p>
        </div>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

function Thumb({ src, label }: { src: string | null; label: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
          {initials(label)}
        </span>
      )}
    </div>
  );
}

interface DayGroup {
  key: string;
  date: dayjs.Dayjs;
  slots: Slot[];
}

function groupByDay(reservations: PlayerReservation[], events: PlayerWeekEvent[]): DayGroup[] {
  const start = dayjs().startOf("day");
  const days = new Map<string, DayGroup>();
  for (let offset = 0; offset < 7; offset += 1) {
    const date = start.add(offset, "day");
    const key = date.format("YYYY-MM-DD");
    days.set(key, { key, date, slots: [] });
  }

  const place = (iso: string, slot: Slot) => {
    const at = dayjs(iso);
    if (!at.isValid()) return;
    const key = at.format("YYYY-MM-DD");
    const existing = days.get(key);
    if (existing) {
      existing.slots.push(slot);
      return;
    }
    days.set(key, { key, date: at.startOf("day"), slots: [slot] });
  };

  for (const reservation of reservations) {
    place(reservation.startsAt, {
      kind: "reservation",
      at: dayjs(reservation.startsAt).valueOf(),
      reservation,
    });
  }
  for (const event of events) {
    place(event.startsAt, { kind: "event", at: dayjs(event.startsAt).valueOf(), event });
  }

  return [...days.values()]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((day) => ({
      ...day,
      slots: [...day.slots].sort((left, right) => left.at - right.at),
    }));
}

function clock(iso: string): string {
  const at = dayjs(iso);
  return at.isValid() ? at.format("HH:mm") : "—";
}

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return letters || "C";
}
