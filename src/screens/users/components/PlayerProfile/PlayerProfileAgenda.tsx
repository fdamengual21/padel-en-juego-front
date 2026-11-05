import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CalendarDays, ChevronRight, Loader2 } from "lucide-react";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import { StatusChip } from "@/components/StatusChip";
import type { PlayerWeekItem } from "@/domain";
import { cn } from "@/lib/utils";
import type { PlayerReservation } from "@/modules/reservations";
import { ROUTES } from "@/router/routes";
import PlayerReservationDetailModal from "@/screens/users/components/PlayerReservationDetailModal";
import { toReservation, weekChip } from "@/screens/users/UserHomeScreen/weekItemChip";

const VISIBLE = 3;

export default function PlayerProfileAgenda() {
  const queryClient = useQueryClient();
  const { playerId } = useMockSession();
  const [selected, setSelected] = useState<PlayerReservation | null>(null);
  const week = useQuery({
    queryKey: ["player-week", playerId],
    queryFn: () => Api.TournamentOpsService().getMyWeek(),
    staleTime: 0,
  });

  const items = upcoming(week.data?.items ?? []);
  const visible = items.slice(0, VISIBLE);

  return (
    <section className="space-y-3" data-testid="player-profile-agenda">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <CalendarDays className="size-4 text-primary-strong" aria-hidden />
            Tu agenda
          </h3>
          <p className="text-xs text-muted-foreground">Próximos partidos y turnos.</p>
        </div>
        {items.length > 0 ? (
          <Link
            to={ROUTES.player.home}
            className="inline-flex shrink-0 items-center text-xs font-medium text-primary-strong underline-offset-4 hover:underline"
          >
            {items.length > VISIBLE ? `Ver los ${items.length}` : "Ver semana"}
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      {week.isLoading ? (
        <div className="flex justify-center py-6" role="status" aria-label="Cargando agenda">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : week.isError ? (
        <p className="rounded-xl border border-border bg-card p-4 text-center text-sm text-destructive">
          No pudimos cargar tu agenda.
        </p>
      ) : visible.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">No tenés partidos ni turnos próximos.</p>
          <Link
            to={ROUTES.player.clubs}
            className="text-sm font-medium text-primary-strong underline-offset-4 hover:underline"
          >
            Reservar cancha
          </Link>
        </div>
      ) : (
        <div className="grid gap-2 lg:grid-cols-3">
          {visible.map((item) => {
            const chip = weekChip(item);
            const reservation = item.type === "reservation" ? toReservation(item) : null;
            return (
              <AgendaRow
                key={`${item.type}-${item.id}`}
                at={item.startsAt}
                endsAt={item.endsAt}
                title={item.title}
                meta={item.subtitle ?? ""}
                chip={
                  chip ? <StatusChip tone={chip.tone} label={chip.label} icon={null} /> : null
                }
                to={
                  item.tournamentId
                    ? ROUTES.player.tournamentDetail(item.tournamentId)
                    : undefined
                }
                onClick={
                  reservation
                    ? () => setSelected(reservation)
                    : undefined
                }
              />
            );
          })}
        </div>
      )}

      <PlayerReservationDetailModal
        reservation={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onCancelled={() => {
          setSelected(null);
          void queryClient.invalidateQueries({ queryKey: ["player-week"] });
        }}
      />
    </section>
  );
}

function AgendaRow({
  at,
  endsAt,
  title,
  meta,
  chip,
  to,
  onClick,
}: {
  at: string;
  endsAt: string | null;
  title: string;
  meta: string;
  chip: ReactNode;
  to?: string;
  onClick?: () => void;
}) {
  const start = dayjs(at);
  const isToday = start.isSame(dayjs(), "day");
  const time = endsAt ? `${start.format("HH:mm")} – ${dayjs(endsAt).format("HH:mm")}` : start.format("HH:mm");
  const className =
    "flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 text-left";
  const content = (
    <>
      <div
        className={cn(
          "flex w-12 shrink-0 flex-col items-center rounded-lg py-1.5",
          isToday ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        <span className="text-[10px] font-semibold uppercase leading-none">
          {isToday ? "Hoy" : start.format("ddd").replace(".", "")}
        </span>
        <span className="text-lg font-semibold leading-tight tabular-nums">{start.format("D")}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="min-w-0 truncate text-sm font-semibold tracking-tight">{title}</p>
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">{time}</span>
          {meta ? ` · ${meta}` : null}
        </p>
        {chip ? <div className="flex min-w-0 items-center gap-1.5">{chip}</div> : null}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" className={className} disabled>
      {content}
    </button>
  );
}

function upcoming(items: PlayerWeekItem[]): PlayerWeekItem[] {
  const now = Date.now();
  return items
    .filter((item) => {
      if (item.type === "reservation" && item.status !== "pending" && item.status !== "booked") {
        return false;
      }
      return dayjs(item.endsAt ?? item.startsAt).valueOf() >= now;
    })
    .filter((item) => Number.isFinite(dayjs(item.startsAt).valueOf()))
    .sort((left, right) => dayjs(left.startsAt).valueOf() - dayjs(right.startsAt).valueOf());
}
