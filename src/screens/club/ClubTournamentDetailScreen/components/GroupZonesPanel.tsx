import { useState } from "react";
import type { Court, GroupStanding, Match, MatchRules, TournamentGroup } from "@/domain";
import { scoreboardSlotCount } from "@/domain";
import MatchCourtSelect, {
  MatchHorarioButton,
  MatchScheduleTimeModal,
} from "./MatchScheduleCell";
import MatchStatusModal from "./MatchStatusModal";
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
import { groupQualificationTargetLabel } from "@/domain";

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
  reservations?: import("@/domain").CourtReservation[];
  matchDurationMinutes?: number;
  scheduleSavingMatchId?: string | null;
  /** Torneo finalizado/cancelado: sin editar agenda, cancha ni resultado. */
  tournamentLocked?: boolean;
  /** Cuántos clasifican por zona (para marcar avance). */
  qualifyPerGroup?: number;
  /** Zonas con todos los partidos terminados. */
  finishedGroupIds?: string[];
  onSaveSchedule?: (input: {
    matchId: string;
    scheduledAt: string | null;
    courtId: string | null;
    force?: boolean;
  }) => Promise<void> | void;
  onOpenResult: (match: Match) => void;
  onSetStatus?: (input: {
    matchId: string;
    status: "scheduled" | "inProgress";
  }) => Promise<void> | void;
  statusSavingMatchId?: string | null;
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
  tournamentLocked = false,
  qualifyPerGroup = 2,
  finishedGroupIds = [],
  onSaveSchedule,
  onOpenResult,
  onSetStatus,
  statusSavingMatchId = null,
  compact = false,
}: GroupZonesPanelProps) {
  const [scheduleMatchId, setScheduleMatchId] = useState<string | null>(null);
  const [statusMatchId, setStatusMatchId] = useState<string | null>(null);
  const finishedGroupSet = new Set(finishedGroupIds);

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
  const statusMatch =
    statusMatchId != null
      ? (scheduleMatches.find((m) => m.id === statusMatchId) ??
          matches.find((m) => m.id === statusMatchId) ??
          null)
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
        const zoneFinished = finishedGroupSet.has(group.id);
        const groupStandings = standings
          .filter((s) => s.groupId === group.id)
          .sort((a, b) => a.position - b.position);

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
                    const playStatus = resolveMatchPlayStatus(match, matchRules);
                    const hasPairs = Boolean(match.pairAId && match.pairBId);
                    const matchCancelled = match.status === "cancelled";
                    const matchClosed =
                      playStatus === "finished" ||
                      match.status === "finished" ||
                      match.status === "walkover" ||
                      matchCancelled;
                    const canEditResult =
                      hasPairs && !tournamentLocked && !matchCancelled;
                    const canEditSchedule =
                      hasPairs && !tournamentLocked && !matchClosed;
                    const canEditStatus =
                      hasPairs &&
                      !tournamentLocked &&
                      !matchClosed &&
                      Boolean(onSetStatus);
                    return (
                      <TableRow key={match.id}>
                        <TableCell className="w-0 px-2 py-1.5 text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                          N°{index + 1}
                        </TableCell>
                        <TableCell className="w-0 px-2 py-1.5 text-sm font-medium whitespace-nowrap">
                          {seedA && seedB ? `${seedA} vs ${seedB}` : "—"}
                        </TableCell>
                        <TableCell className="w-[7.25rem] px-2 py-1.5">
                          {showAgenda && onSaveSchedule ? (
                            <MatchHorarioButton
                              scheduledAt={match.scheduledAt}
                              disabled={!canEditSchedule}
                              onClick={() => setScheduleMatchId(match.id)}
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatScheduleShortEs(match.scheduledAt)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="w-[6.25rem] px-2 py-1.5">
                          <button
                            type="button"
                            data-testid={`match-status-cell-${match.id}`}
                            disabled={!canEditStatus}
                            className={cn(
                              "rounded-md text-left transition-colors",
                              canEditStatus
                                ? "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                : "cursor-default opacity-80",
                            )}
                            onClick={() => {
                              if (!canEditStatus) return;
                              setStatusMatchId(match.id);
                            }}
                          >
                            <MatchPlayStatusChip
                              status={playStatus}
                              className="h-5 px-2 text-xs"
                            />
                          </button>
                        </TableCell>
                        <TableCell className="w-[17rem] px-2 py-1.5 whitespace-normal">
                          <PairVsBlock
                            className="text-sm"
                            pairALabel={pairLabels[match.pairAId ?? ""] ?? "Por definir"}
                            pairBLabel={pairLabels[match.pairBId ?? ""] ?? "Por definir"}
                          />
                        </TableCell>
                        <TableCell className="w-[11rem] px-2 py-1.5 text-left whitespace-normal">
                          <button
                            type="button"
                            data-testid={`match-result-cell-${match.id}`}
                            disabled={!canEditResult}
                            className={cn(
                              "inline-flex justify-start rounded-md text-left transition-colors",
                              canEditResult
                                ? "cursor-pointer hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                : "cursor-default opacity-60",
                            )}
                            onClick={() => {
                              if (!canEditResult) return;
                              onOpenResult(match);
                            }}
                          >
                            <MatchScoreBoxes
                              sets={match.sets}
                              slotCount={slotCount}
                              decidingSlotIndex={decidingSlotIndex}
                              size="md"
                            />
                          </button>
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
                              disabled={!canEditSchedule}
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
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Posiciones (sets ganados − perdidos)
                  </p>
                  {zoneFinished ? (
                    <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs font-medium text-foreground">
                      Zona finalizada · top {qualifyPerGroup} al cuadro
                    </span>
                  ) : null}
                </div>
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
                        {zoneFinished ? (
                          <StandingColumnHead
                            label="Avance"
                            fullName="Clasificación al cuadro"
                          />
                        ) : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupStandings.map((row) => {
                        const qualifies =
                          zoneFinished &&
                          row.position > 0 &&
                          row.position <= qualifyPerGroup;
                        return (
                          <TableRow
                            key={row.id}
                            className={cn(qualifies && "bg-primary/10")}
                          >
                            <TableCell>{row.position || "—"}</TableCell>
                            <TableCell className="font-medium">
                              {pairLabels[row.pairId]}
                            </TableCell>
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
                            {zoneFinished ? (
                              <TableCell>
                                {qualifies ? (
                                  <span className="inline-flex rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                                    {groupQualificationTargetLabel(row.position)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            ) : null}
                          </TableRow>
                        );
                      })}
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

      {onSetStatus ? (
        <MatchStatusModal
          open={Boolean(statusMatch)}
          match={statusMatch}
          pairALabel={
            pairLabels[statusMatch?.pairAId ?? ""] ?? "Pareja A"
          }
          pairBLabel={
            pairLabels[statusMatch?.pairBId ?? ""] ?? "Pareja B"
          }
          isSubmitting={
            statusMatch != null && statusSavingMatchId === statusMatch.id
          }
          onOpenChange={(open) => {
            if (!open) setStatusMatchId(null);
          }}
          onSubmit={async (status) => {
            if (!statusMatch) return;
            await onSetStatus({ matchId: statusMatch.id, status });
          }}
        />
      ) : null}
    </div>
  );
}
