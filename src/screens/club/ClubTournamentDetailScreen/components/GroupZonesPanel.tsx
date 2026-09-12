import { useState } from "react";
import type { Court, GroupStanding, Match, MatchRules, TournamentGroup } from "@core-api";
import { scoreboardSlotCount } from "@core-api";
import MatchCourtSelect, {
  MatchHorarioButton,
  MatchScheduleTimeModal,
} from "./MatchScheduleCell";
import MatchPlayStatusChip from "@/components/tournaments/MatchPlayStatusChip";
import MatchScoreBoxes from "@/components/tournaments/MatchScoreBoxes";
import PairVsBlock from "@/components/tournaments/PairVsBlock";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { resolveMatchPlayStatus } from "@/lib/matchPlayStatus";
import { formatScheduleShortEs } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface StandingColumnHeadProps {
  label: string;
  fullName: string;
}

function StandingColumnHead({ label, fullName }: StandingColumnHeadProps) {
  return (
    <TableHead>
      <Tooltip>
        <TooltipTrigger
          delay={200}
          className="cursor-help"
          render={<span />}
        >
          {label}
        </TooltipTrigger>
        <TooltipContent>{fullName}</TooltipContent>
      </Tooltip>
    </TableHead>
  );
}

interface GroupZonesPanelProps {
  groups: TournamentGroup[];
  matches: Match[];
  standings: GroupStanding[];
  pairLabels: Record<string, string>;
  /** @deprecated Nombres van en PairVsBlock vía pairLabels; se mantiene por compat. */
  pairPlayerNames?: Record<string, [string, string]>;
  matchRules: MatchRules;
  courts?: Court[];
  allMatches?: Match[];
  reservations?: import("@core-api").CourtReservation[];
  matchDurationMinutes?: number;
  scheduleSavingMatchId?: string | null;
  onSaveSchedule?: (input: {
    matchId: string;
    scheduledAt: string | null;
    courtId: string | null;
    force?: boolean;
  }) => Promise<void> | void;
  onOpenResult: (match: Match) => void;
  /** En el cuadro: sin posiciones. Una fila por partido. */
  compact?: boolean;
}

function pairIndexInGroup(group: TournamentGroup, pairId: string | null): number | null {
  if (!pairId) return null;
  const idx = group.pairIds.indexOf(pairId);
  return idx >= 0 ? idx + 1 : null;
}

export default function GroupZonesPanel({
  groups,
  matches,
  standings,
  pairLabels,
  matchRules,
  courts = [],
  allMatches,
  reservations = [],
  matchDurationMinutes,
  scheduleSavingMatchId = null,
  onSaveSchedule,
  onOpenResult,
  compact = false,
}: GroupZonesPanelProps) {
  const [scheduleMatchId, setScheduleMatchId] = useState<string | null>(null);

  if (!groups.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay zonas. Se generan solas cuando el cupo de la configuración se completa.
      </p>
    );
  }

  const slotCount = scoreboardSlotCount(matchRules);
  const decidingSlotIndex =
    matchRules.superTiebreakEnabled && matchRules.setsToWin >= 2 ? slotCount - 1 : null;
  const scheduleMatches = allMatches ?? matches;
  const showAgenda = Boolean(onSaveSchedule) && !compact;
  const scheduleMatch =
    scheduleMatchId != null
      ? (scheduleMatches.find((m) => m.id === scheduleMatchId) ?? null)
      : null;

  return (
    <div className={cn("space-y-4", compact && "space-y-3")} data-testid="group-zones-panel">
      {groups.map((group) => {
        const groupMatches = matches
          .filter((m) => m.groupId === group.id && m.phase === "GROUP")
          .sort(
            (a, b) =>
              (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? "") ||
              a.id.localeCompare(b.id),
          );

        return (
          <section
            key={group.id}
            className="rounded-xl border border-border bg-card overflow-hidden"
            data-testid={`group-zone-${group.id}`}
          >
            <div className="overflow-x-auto">
              <Table className="table-fixed min-w-[44rem]">
                <TableHeader>
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead
                      colSpan={2}
                      className="h-9 w-[6.75rem] bg-primary/90 px-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground sm:text-sm"
                    >
                      {group.name.replace(/^Grupo\b/i, "Zona")}
                    </TableHead>
                    <TableHead className="h-9 w-[7.25rem] bg-primary/90 px-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground sm:text-sm">
                      Horarios
                    </TableHead>
                    <TableHead className="h-9 w-[6.25rem] bg-primary/90 px-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground sm:text-sm">
                      Estado
                    </TableHead>
                    <TableHead className="h-9 w-[17rem] bg-primary/90 px-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground sm:text-sm">
                      Partidos
                    </TableHead>
                    <TableHead className="h-9 w-[11rem] bg-primary/90 px-2 text-left text-xs font-semibold uppercase tracking-wide text-primary-foreground sm:text-sm">
                      Resultado
                    </TableHead>
                    {showAgenda ? (
                      <TableHead className="h-9 w-[7.5rem] bg-primary/90 px-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground sm:text-sm">
                        Cancha
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupMatches.map((match, index) => {
                    const seedA = pairIndexInGroup(group, match.pairAId);
                    const seedB = pairIndexInGroup(group, match.pairBId);
                    const canEdit = Boolean(match.pairAId && match.pairBId);
                    const playStatus = resolveMatchPlayStatus(match, matchRules);
                    return (
                      <TableRow
                        key={match.id}
                        className={cn(canEdit && "cursor-pointer hover:bg-muted/40")}
                        onClick={(e) => {
                          if (!canEdit) return;
                          const target = e.target as HTMLElement;
                          if (
                            target.closest(
                              "button, select, a, input, textarea, label, [role='dialog'], [data-slot='alert-dialog-content']",
                            )
                          ) {
                            return;
                          }
                          onOpenResult(match);
                        }}
                      >
                        <TableCell className="w-0 px-2 py-1.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          N°{index + 1}
                        </TableCell>
                        <TableCell className="w-0 px-2 py-1.5 text-xs font-medium whitespace-nowrap">
                          {seedA && seedB ? `${seedA} vs ${seedB}` : "—"}
                        </TableCell>
                        <TableCell className="w-[7.25rem] px-2 py-1.5">
                          {showAgenda && onSaveSchedule ? (
                            <MatchHorarioButton
                              scheduledAt={match.scheduledAt}
                              disabled={!canEdit}
                              onClick={() => setScheduleMatchId(match.id)}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatScheduleShortEs(match.scheduledAt)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="w-[6.25rem] px-2 py-1.5">
                          <MatchPlayStatusChip
                            status={playStatus}
                            className="h-4 px-1.5 text-[10px]"
                          />
                        </TableCell>
                        <TableCell className="w-[17rem] px-2 py-1.5 whitespace-normal">
                          <PairVsBlock
                            className="text-[11px]"
                            pairALabel={pairLabels[match.pairAId ?? ""] ?? "Por definir"}
                            pairBLabel={pairLabels[match.pairBId ?? ""] ?? "Por definir"}
                          />
                        </TableCell>
                        <TableCell className="w-[11rem] px-2 py-1.5 text-left whitespace-normal">
                          <div
                            data-testid={`match-result-cell-${match.id}`}
                            className={cn(
                              "inline-flex justify-start",
                              !canEdit && "opacity-60",
                            )}
                          >
                            <MatchScoreBoxes
                              sets={match.sets}
                              slotCount={slotCount}
                              decidingSlotIndex={decidingSlotIndex}
                              size="md"
                            />
                          </div>
                        </TableCell>
                        {showAgenda && onSaveSchedule ? (
                          <TableCell className="w-[7.5rem] px-2 py-1.5 align-middle">
                            <MatchCourtSelect
                              match={match}
                              courts={courts}
                              pairLabels={pairLabels}
                              allMatches={scheduleMatches}
                              reservations={reservations}
                              matchDurationMinutes={matchDurationMinutes}
                              disabled={!canEdit}
                              isSaving={scheduleSavingMatchId === match.id}
                              onSave={onSaveSchedule}
                            />
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                  {groupMatches.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={showAgenda ? 7 : 6}
                        className="text-sm text-muted-foreground"
                      >
                        Sin partidos en esta zona.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            {!compact ? (
              <div className="border-t border-border px-3 py-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Posiciones (sets ganados − perdidos)
                </p>
                <TooltipProvider delay={200}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <StandingColumnHead label="Pos" fullName="Posición" />
                        <StandingColumnHead label="Pareja" fullName="Pareja" />
                        <StandingColumnHead label="SG" fullName="Sets ganados" />
                        <StandingColumnHead label="SP" fullName="Sets perdidos" />
                        <StandingColumnHead
                          label="Dif. sets"
                          fullName="Diferencia de sets"
                        />
                        <StandingColumnHead
                          label="PJ"
                          fullName="Partidos jugados"
                        />
                        <StandingColumnHead
                          label="PG"
                          fullName="Partidos ganados"
                        />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standings
                        .filter((s) => s.groupId === group.id)
                        .sort((a, b) => a.position - b.position)
                        .map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.position || "—"}</TableCell>
                            <TableCell>{pairLabels[row.pairId]}</TableCell>
                            <TableCell className="tabular-nums">
                              {row.setsWon}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {row.setsLost}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {row.setsWon - row.setsLost > 0 ? "+" : ""}
                              {row.setsWon - row.setsLost}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {row.played}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {row.won}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TooltipProvider>
              </div>
            ) : null}
          </section>
        );
      })}

      {onSaveSchedule ? (
        <MatchScheduleTimeModal
          open={Boolean(scheduleMatch)}
          match={scheduleMatch}
          courts={courts}
          pairLabels={pairLabels}
          allMatches={scheduleMatches}
          reservations={reservations}
          matchDurationMinutes={matchDurationMinutes}
          isSaving={
            scheduleMatch != null && scheduleSavingMatchId === scheduleMatch.id
          }
          onOpenChange={(open) => {
            if (!open) setScheduleMatchId(null);
          }}
          onSave={onSaveSchedule}
        />
      ) : null}
    </div>
  );
}
