import dayjs from "dayjs";
import { ChevronRight, MapPin, User } from "lucide-react";
import Avatar from "@/components/Avatar";
import { PlayerReservationStatusChip } from "@/components/reservations";
import type { ClubTodayTurn } from "@/modules/reservations";

interface DashboardTodayTurnsProps {
  turns: ClubTodayTurn[];
  onOpen: (turn: ClubTodayTurn) => void;
}

export default function DashboardTodayTurns({ turns, onOpen }: DashboardTodayTurnsProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Turnos de hoy</h3>
      {turns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay turnos para el resto del día.</p>
      ) : (
        <div className="flex items-stretch overflow-x-auto rounded-2xl bg-primary/15 p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {turns.map((turn, index) => (
            <div key={`${turn.courtId}-${turn.startsAt}`} className="flex min-w-56 flex-1">
              {index > 0 ? <div className="mx-3 w-px shrink-0 self-stretch bg-border" aria-hidden /> : null}
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2.5 px-1 py-1 text-left"
                onClick={() => onOpen(turn)}
              >
                {turn.status === "free" ? (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <User className="size-5" aria-hidden />
                  </span>
                ) : (
                  <Avatar name={playerName(turn)} size="sm" className="size-11 rounded-md" />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <p className="truncate text-sm font-semibold tracking-tight">{formatRange(turn)}</p>
                  <p className="flex items-center gap-1 truncate text-[11px] leading-none text-muted-foreground">
                    <MapPin className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{turn.courtName || "Cancha"}</span>
                  </p>
                  <TurnChip status={turn.status} />
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TurnChip({ status }: { status: ClubTodayTurn["status"] }) {
  if (status === "pending" || status === "booked") {
    return <PlayerReservationStatusChip status={status} className="self-start" />;
  }
  if (status === "completed") {
    return (
      <span className="self-start rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
        Completada
      </span>
    );
  }
  return (
    <span className="self-start rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
      Libre
    </span>
  );
}

function playerName(turn: ClubTodayTurn): string {
  if (turn.status === "free") return "Libre";
  return `${turn.playerFirstName ?? ""} ${turn.playerLastName ?? ""}`.trim() || "Jugador";
}

function formatRange(turn: ClubTodayTurn): string {
  const start = dayjs(turn.startsAt);
  const end = dayjs(turn.endsAt);
  if (!start.isValid()) return "Sin horario";
  return `${start.format("HH:mm")} – ${end.format("HH:mm")}`;
}
