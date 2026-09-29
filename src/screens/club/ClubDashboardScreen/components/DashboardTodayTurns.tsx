import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { ChevronRight, Clock } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { PlayerReservationStatusChip } from "@/components/reservations";
import type { ClubTodayTurn } from "@/modules/reservations";
import DashboardIconWell from "@/screens/club/components/DashboardIconWell";

interface DashboardTodayTurnsProps {
  turns: ClubTodayTurn[];
  isLoading: boolean;
  isError: boolean;
  agendaTo?: string;
  onOpen: (turn: ClubTodayTurn) => void;
}

export default function DashboardTodayTurns({
  turns,
  isLoading,
  isError,
  agendaTo,
  onOpen,
}: DashboardTodayTurnsProps) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DashboardIconWell icon={Clock} />
          <h3 className="text-sm font-semibold">Turnos de hoy</h3>
        </div>
        {agendaTo ? (
          <Link to={agendaTo} className="text-sm text-muted-foreground hover:text-foreground">
            Ver agenda
          </Link>
        ) : null}
      </div>
      {isLoading ? (
        <TodayTurnsSkeleton />
      ) : isError ? (
        <EmptyState
          className="mt-3"
          icon={Clock}
          tone="error"
          title="No se pudieron cargar los turnos"
          description="Reintentá en un momento."
        />
      ) : turns.length === 0 ? (
        <EmptyState
          className="mt-3"
          icon={Clock}
          title="No hay turnos para el resto del día"
          description="Los que siguen aparecen acá a medida que abre el club."
        />
      ) : (
        <div className="mt-3 grid min-w-0 gap-1 sm:grid-cols-2">
          {turns.map((turn) => (
            <button
              key={`${turn.courtId}-${turn.startsAt}`}
              type="button"
              className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
              onClick={() => onOpen(turn)}
            >
              <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">
                {formatHour(turn)}
              </span>
              <TurnPill status={turn.status} />
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {detail(turn)}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function TurnPill({ status }: { status: ClubTodayTurn["status"] }) {
  if (status === "pending") {
    return <PlayerReservationStatusChip status="pending" className="shrink-0" />;
  }
  if (status === "free") {
    return (
      <Badge variant="secondary" className="shrink-0">
        Libre
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="shrink-0 border-transparent! bg-success/15! text-success"
    >
      {status === "completed" ? "Jugado" : "Ocupado"}
    </Badge>
  );
}

function detail(turn: ClubTodayTurn): string {
  const court = turn.courtName || "Cancha";
  if (turn.status === "free") return court;
  const name = `${turn.playerFirstName ?? ""} ${turn.playerLastName ?? ""}`.trim();
  return name ? `${court} · ${name}` : court;
}

function formatHour(turn: ClubTodayTurn): string {
  const start = dayjs(turn.startsAt);
  return start.isValid() ? start.format("HH:mm") : "—";
}

function TodayTurnsSkeleton() {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2" aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
