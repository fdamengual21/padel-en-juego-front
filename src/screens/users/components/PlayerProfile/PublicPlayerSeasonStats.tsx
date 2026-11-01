import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Activity, Flame, Info, Trophy, Users, Zap, type LucideIcon } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PublicPlayerPartner, PublicPlayerSeason } from "@/domain";
import { ROUTES } from "@/router/routes";

interface PublicPlayerSeasonStatsProps {
  season: PublicPlayerSeason;
  partner: PublicPlayerPartner | null;
}

const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

function percent(won: number, played: number): number | null {
  return played > 0 ? (won / played) * 100 : null;
}

function StatCard({
  label,
  hint,
  icon: Icon,
  footerLabel,
  footerValue,
  children,
}: {
  label: string;
  hint: string;
  icon: LucideIcon;
  footerLabel: string;
  footerValue: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="inline-flex cursor-help rounded-full text-sidebar hover:text-sidebar/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-sidebar-foreground"
                  aria-label={`Qué significa ${label.toLowerCase()}`}
                />
              }
            >
              <Info className="size-3.5" strokeWidth={2.5} aria-hidden />
            </TooltipTrigger>
            <TooltipContent className="max-w-64">{hint}</TooltipContent>
          </Tooltip>
        </div>
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent text-primary-strong">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="flex-1 space-y-1">{children}</div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span>{footerLabel}</span>
        <span className="font-bold text-foreground tabular-nums">{footerValue}</span>
      </div>
    </div>
  );
}

export default function PublicPlayerSeasonStats({ season, partner }: PublicPlayerSeasonStatsProps) {
  const winRate = percent(season.matchesWon, season.matchesPlayed);
  const partnerRate = partner ? percent(partner.matchesWon, partner.matchesPlayed) : null;

  return (
    <section className="space-y-3" data-testid="public-player-season">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
          <Activity className="size-4 text-primary-strong" aria-hidden />
          Temporada {season.year}
        </h3>
        <p className="text-xs text-muted-foreground">Partidos de torneo terminados este año.</p>
      </div>

      <TooltipProvider delay={150}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Ritmo de juego"
          hint="Promedio de partidos de torneo por semana, desde el primer partido del año hasta hoy. La racha son las semanas seguidas con al menos un partido."
          icon={Zap}
          footerLabel="Partidos jugados"
          footerValue={season.matchesPlayed}
        >
          <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {decimal.format(season.matchesPerWeek)}{" "}
            <span className="text-sm font-medium text-muted-foreground">partidos / semana</span>
          </p>
          {season.weekStreak > 0 ? (
            <p className="flex items-center gap-1 text-xs font-medium text-success-foreground">
              <Flame className="size-3.5" aria-hidden />
              Racha: <span className="font-bold tabular-nums">{season.weekStreak}</span>{" "}
              {season.weekStreak === 1 ? "semana" : "semanas seguidas"}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Sin partidos en las últimas semanas.</p>
          )}
        </StatCard>

        <StatCard
          label="Efectividad"
          hint="Porcentaje de partidos ganados sobre los jugados este año. Un W.O. cuenta como partido ganado o perdido, pero no suma sets."
          icon={Trophy}
          footerLabel="Sets ganados / perdidos"
          footerValue={`${season.setsWon} / ${season.setsLost}`}
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {winRate === null ? "—" : `${decimal.format(winRate)}%`}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground tabular-nums">{season.matchesWon}</span> ganados ·{" "}
                <span className="font-bold text-foreground tabular-nums">{season.matchesLost}</span> perdidos
              </p>
            </div>
            {winRate !== null ? (
              <div className="mb-1.5 h-2 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full rounded-full bg-primary" style={{ width: `${winRate}%` }} />
              </div>
            ) : null}
          </div>
        </StatCard>

        <StatCard
          label="Compañero habitual"
          hint="Con quién jugó más torneos este año. La efectividad juntos es el porcentaje de partidos que ganaron como pareja."
          icon={Users}
          footerLabel="Torneos juntos"
          footerValue={partner?.tournamentsTogether ?? 0}
        >
          {partner ? (
            <div className="flex items-center gap-3">
              <Avatar name={partner.displayName} imageUrl={partner.avatarUrl} size="sm" />
              <div className="min-w-0">
                {partner.userId ? (
                  <Link
                    to={ROUTES.player.playerProfile(partner.userId)}
                    className="block truncate text-sm font-semibold text-foreground hover:underline"
                  >
                    {partner.displayName}
                  </Link>
                ) : (
                  <p className="truncate text-sm font-semibold text-foreground">{partner.displayName}</p>
                )}
                {partnerRate !== null ? (
                  <p className="text-xs font-medium text-success">
                    <span className="font-bold tabular-nums">{decimal.format(partnerRate)}%</span> efectividad juntos
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no jugó en pareja esta temporada.</p>
          )}
        </StatCard>
      </div>
      </TooltipProvider>
    </section>
  );
}
