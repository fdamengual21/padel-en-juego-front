import type { ReactNode } from "react";
import {
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  Tag,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import TournamentStatusChip from "@/components/tournaments/TournamentStatusChip";
import { formatWeekdayShortEs } from "@/lib/dates";
import { formatArs } from "@/lib/money";
import { cn } from "@/lib/utils";
import { nextRankingEvent, rankingScheduleLabel, type ClubRankingCircuit } from "@/modules/rankings";
import { rankingEventStatusView } from "@/modules/tournaments/flows";

interface RankingSummaryStripProps {
  circuit: ClubRankingCircuit;
}

interface StripItem {
  key: string;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}

/** Tira de datos del ranking. En mobile 2 columnas; en desktop una fila con divisores. */
export default function RankingSummaryStrip({ circuit }: RankingSummaryStripProps) {
  const next = nextRankingEvent(circuit.events);
  const nextStatus = next ? rankingEventStatusView(next) : null;
  const players = circuit.playerCount ?? 0;
  const items: StripItem[] = [
    { key: "category", icon: Tag, label: "Categoría", value: circuit.categoryName },
    {
      key: "dates",
      icon: CalendarDays,
      label: "Fechas",
      value: `${circuit.weekCount} fechas`,
      detail: rankingScheduleLabel(circuit),
    },
    {
      key: "next",
      icon: CalendarClock,
      label: "Próxima fecha",
      value: next
        ? `Fecha ${next.weekIndex ?? "—"} · ${formatWeekdayShortEs(next.startDate)}`
        : circuit.status === "finished"
          ? "Ranking finalizado"
          : "Sin fechas pendientes",
      detail: nextStatus ? (
        <TournamentStatusChip view={nextStatus} />
      ) : null,
    },
    {
      key: "fee",
      icon: CircleDollarSign,
      label: "Inscripción",
      value: circuit.registrationFee > 0 ? formatArs(circuit.registrationFee) : "Sin cargo",
      detail: circuit.registrationFee > 0 ? "por fecha" : null,
    },
    {
      key: "cupo",
      icon: UsersRound,
      label: "Cupo por fecha",
      value: `${circuit.defaultMaxPairs} parejas`,
    },
    {
      key: "players",
      icon: Users,
      label: "Jugadores",
      value: players === 1 ? "1 jugador" : `${players} jugadores`,
    },
  ];

  return (
    <section
      className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-6 lg:gap-x-0"
      data-testid="ranking-summary-strip"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className={cn("min-w-0 space-y-1", index > 0 && "lg:border-l lg:border-border lg:pl-4", "lg:pr-4")}
          >
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </p>
            <p className="truncate text-base font-semibold text-foreground">{item.value}</p>
            {item.detail ? (
              <div className="text-xs text-muted-foreground">{item.detail}</div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
