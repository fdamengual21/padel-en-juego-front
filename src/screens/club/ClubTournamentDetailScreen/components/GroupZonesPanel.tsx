import { useState, type ReactNode } from "react";
import { ChevronDown, Info } from "lucide-react";
import type {
  Court,
  GroupStanding,
  Match,
  MatchPhase,
  MatchRules,
  MatchSlot,
  TournamentGroup,
  UnresolvedTie,
} from "@/domain";
import {
  canOpenMatchResult,
  matchWinnerSide,
  scoreboardSlotCount,
  tieBreakHint,
  tieBreakLabel,
} from "@/domain";
import MatchCourtSelect, {
  MatchHorarioButton,
  MatchScheduleTimeModal,
} from "./MatchScheduleCell";
import MatchStatusModal from "./MatchStatusModal";
import ResolveTieModal from "./ResolveTieModal";
import MatchPlayStatusChip from "@/components/tournaments/MatchPlayStatusChip";
import MatchScoreBoxes from "@/components/tournaments/MatchScoreBoxes";
import PairVsBlock from "@/components/tournaments/PairVsBlock";
import { Button } from "@/components/ui/button";
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
import { matchPlayStatusHint, resolveMatchPlayStatus } from "@/lib/matchPlayStatus";
import { formatScheduleShortEs } from "@/lib/dates";
import { roundSectionLabel } from "@/lib/tournamentLabels";
import { cn } from "@/lib/utils";

const KNOCKOUT_PHASES: MatchPhase[] = [
  "PLAY_IN",
  "R32",
  "R16",
  "QF",
  "SF",
  "FINAL",
  "CONSOLATION",
];

const headClass =
  "h-7 bg-primary/90 px-2 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground";

interface StandingColumnHeadProps {
  label: string;
  fullName: string;
}

function StandingColumnHead({ label, fullName }: StandingColumnHeadProps) {
  return (
    <TableHead className="h-7 px-2 text-[11px]">
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
  slots?: MatchSlot[];
  reservations?: import("@/domain").CourtReservation[];
  matchDurationMinutes?: number;
  scheduleSavingMatchId?: string | null;
  /** Torneo finalizado/cancelado: sin editar agenda, cancha ni resultado. */
  tournamentLocked?: boolean;
  /** Zonas con todos los partidos terminados. */
  finishedGroupIds?: string[];
  onSaveSchedule?: (input: {
    matchId: string;
    scheduledAt: string | null;
    courtId: string | null;
    force?: boolean;
  }) => Promise<void> | void;
  onOpenResult: (match: Match) => void;
  /** Detalle de inscripción de una pareja (el mismo del tab Participantes). */
  onOpenPair?: (pairId: string) => void;
  onSetStatus?: (input: {
    matchId: string;
    status: "scheduled" | "inProgress";
  }) => Promise<void> | void;
  statusSavingMatchId?: string | null;
  /** Empates que el reglamento no pudo resolver (por zona). */
  unresolvedTies?: UnresolvedTie[];
  onResolveTie?: (input: {
    groupId: string;
    order: string[];
    note: string;
  }) => Promise<void> | void;
  tieSavingGroupId?: string | null;
  /** En el cuadro: sin posiciones. Una fila por partido. */
  compact?: boolean;
}

const STANDINGS_HINT =
  "Orden: puntos (2 ganado, 1 perdido, 0 W.O.); entre dos empatadas, el partido directo; entre tres o más, sets y games solo entre ellas, luego games de toda la zona. Si todo sigue igual, el club sortea desde acá.";

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`;
}

function pairIndexInGroup(group: TournamentGroup, pairId: string | null): number | null {
  if (!pairId) return null;
  const idx = group.pairIds.indexOf(pairId);
  return idx >= 0 ? idx + 1 : null;
}

function pendingSide(source: string | undefined): string | null {
  if (source === "MATCH_WINNER") return "Ganador";
  if (source === "MATCH_LOSER") return "Perdedor";
  return null;
}

function slotSource(slots: MatchSlot[], matchId: string, side: "A" | "B") {
  return slots.find((slot) => slot.matchId === matchId && slot.side === side)?.sourceType;
}

function qualifyHeadline(count: number): string | null {
  if (count === 1) return "Pasa el primero";
  if (count === 2) return "Pasan los dos primeros";
  if (count === 3) return "Pasan los tres primeros";
  return null;
}

function matchClosed(match: Match): boolean {
  return (
    match.status === "finished" ||
    match.status === "walkover" ||
    match.status === "cancelled"
  );
}

/** La fase siguiente aparece cuando la anterior ya no tiene partidos abiertos. */
function visibleKnockoutPhases(matches: Match[]): MatchPhase[] {
  const present = KNOCKOUT_PHASES.filter((phase) =>
    matches.some((match) => match.phase === phase),
  );
  const groupsDone = matches
    .filter((match) => match.phase === "GROUP")
    .every(matchClosed);
  const visible: MatchPhase[] = [];
  let unlocked = groupsDone;
  for (const phase of present) {
    if (!unlocked) break;
    visible.push(phase);
    unlocked = matches
      .filter((match) => match.phase === phase)
      .every(matchClosed);
  }
  return visible;
}

function sideLabel(
  match: Match,
  side: "A" | "B",
  slots: MatchSlot[],
  pairLabels: Record<string, string>,
  groupNames: Record<string, string>,
): string {
  const pairId = side === "A" ? match.pairAId : match.pairBId;
  if (pairId && pairLabels[pairId]) return pairLabels[pairId];
  const slot = slots.find((item) => item.matchId === match.id && item.side === side);
  if (
    slot?.sourceType === "GROUP_POSITION" &&
    slot.groupId &&
    slot.groupPosition != null
  ) {
    const zone = groupNames[slot.groupId] ?? "Zona";
    return `${slot.groupPosition}° ${zone}`;
  }
  return pendingSide(slot?.sourceType) ?? "Por definir";
}

interface ZoneSectionFrameProps {
  sectionId: string;
  title: string;
  testId: string;
  open: boolean;
  showAgenda: boolean;
  onToggle: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

function ZoneSectionFrame({
  sectionId,
  title,
  testId,
  open,
  showAgenda,
  onToggle,
  children,
  footer,
}: ZoneSectionFrameProps) {
  return (
    <section
      className="relative overflow-hidden rounded-xl border border-border bg-card"
      data-testid={testId}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? `Minimizar ${title}` : `Expandir ${title}`}
        data-testid={`zone-toggle-${sectionId}`}
        className="absolute top-0 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-md text-primary-foreground hover:bg-primary-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onToggle}
      >
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </button>
      <div className="overflow-x-auto">
        <Table className="min-w-[44rem] table-fixed text-xs">
          <colgroup>
            <col className="w-[2.5rem]" />
            <col className="w-[8rem]" />
            <col className="w-[7.25rem]" />
            <col className="w-[6.25rem]" />
            <col className="w-[17rem]" />
            <col className="w-[11rem]" />
            {showAgenda ? <col className="w-[7.5rem]" /> : null}
          </colgroup>
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead colSpan={2} className={cn(headClass, "whitespace-nowrap")}>
                {title}
              </TableHead>
              <TableHead className={headClass}>Horarios</TableHead>
              <TableHead className={headClass}>Estado</TableHead>
              <TableHead className={headClass}>Partidos</TableHead>
              <TableHead className={cn(headClass, "text-left", !showAgenda && "pr-8")}>
                Resultado
              </TableHead>
              {showAgenda ? (
                <TableHead className={cn(headClass, "pr-8")}>Cancha</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          {open ? <TableBody>{children}</TableBody> : null}
        </Table>
      </div>
      {open ? footer : null}
    </section>
  );
}

export default function GroupZonesPanel({
  groups,
  matches,
  standings,
  pairLabels,
  matchRules,
  courts = [],
  allMatches,
  slots = [],
  reservations = [],
  matchDurationMinutes,
  scheduleSavingMatchId = null,
  tournamentLocked = false,
  finishedGroupIds = [],
  onSaveSchedule,
  onOpenResult,
  onOpenPair,
  onSetStatus,
  statusSavingMatchId = null,
  unresolvedTies = [],
  onResolveTie,
  tieSavingGroupId = null,
  compact = false,
}: GroupZonesPanelProps) {
  const [scheduleMatchId, setScheduleMatchId] = useState<string | null>(null);
  const [statusMatchId, setStatusMatchId] = useState<string | null>(null);
  const [tieGroupId, setTieGroupId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const tieByGroup = new Map(unresolvedTies.map((tie) => [tie.groupId, tie]));
  const tieGroup = tieGroupId ? (groups.find((g) => g.id === tieGroupId) ?? null) : null;
  const tieForModal = tieGroupId ? (tieByGroup.get(tieGroupId) ?? null) : null;
  const finishedGroupSet = new Set(finishedGroupIds);
  const scheduleMatches = allMatches ?? matches;
  const knockoutPhases = visibleKnockoutPhases(scheduleMatches);
  const groupNames: Record<string, string> = {};
  for (const group of groups) {
    groupNames[group.id] = group.name.replace(/^Grupo\b/i, "Zona");
  }

  if (!groups.length && knockoutPhases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay zonas. Se generan solas cuando el cupo de la configuración se completa.
      </p>
    );
  }

  const slotCount = scoreboardSlotCount(matchRules);
  const decidingSlotIndex =
    matchRules.superTiebreakEnabled && matchRules.setsToWin >= 2 ? slotCount - 1 : null;
  const showAgenda = Boolean(onSaveSchedule) && !compact;
  const sectionOpen = (id: string) => collapsed[id] !== true;
  const toggleSection = (id: string) =>
    setCollapsed((current) => ({ ...current, [id]: !current[id] }));
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
          .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
        const passedLabel = qualifyHeadline(group.qualifies ?? 0);
        const zoneFinished = finishedGroupSet.has(group.id);
        const groupStandings = standings
          .filter((s) => s.groupId === group.id)
          .sort((a, b) => a.position - b.position);

        const zoneTitle = group.name.replace(/^Grupo\b/i, "Zona");
        const unresolvedTie = tieByGroup.get(group.id) ?? null;
        const tiedSet = new Set(unresolvedTie?.pairIds ?? []);
        return (
          <ZoneSectionFrame
            key={group.id}
            sectionId={group.id}
            title={zoneTitle}
            testId={`group-zone-${group.id}`}
            open={sectionOpen(group.id)}
            showAgenda={showAgenda}
            onToggle={() => toggleSection(group.id)}
            footer={
              !compact ? (
                <div className="border-t border-border px-3 py-2">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <TooltipProvider delay={200}>
                      <p className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        Posiciones
                        <Tooltip>
                          <TooltipTrigger
                            className="cursor-help"
                            aria-label="Cómo se ordena la tabla"
                            render={<span />}
                          >
                            <Info className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">{STANDINGS_HINT}</TooltipContent>
                        </Tooltip>
                      </p>
                    </TooltipProvider>
                    {zoneFinished && passedLabel ? (
                      <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[11px] font-medium text-foreground">
                        Zona finalizada · {passedLabel}
                      </span>
                    ) : null}
                  </div>
                  {unresolvedTie ? (
                    <div
                      className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                      data-testid={`unresolved-tie-${group.id}`}
                    >
                      <span>
                        Empate sin resolver entre{" "}
                        {unresolvedTie.pairIds
                          .map((id) => pairLabels[id] ?? "pareja")
                          .join(", ")}
                        . El reglamento no alcanza: hay que sortear para que esas posiciones
                        pasen al cuadro.
                      </span>
                      {onResolveTie ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={tournamentLocked || tieSavingGroupId === group.id}
                          data-testid={`resolve-tie-${group.id}`}
                          onClick={() => setTieGroupId(group.id)}
                        >
                          Resolver empate
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  <TooltipProvider delay={200}>
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <StandingColumnHead label="Pos" fullName="Posición" />
                          <StandingColumnHead label="Pareja" fullName="Pareja" />
                          <StandingColumnHead label="Pts" fullName="Puntos (2 ganado, 1 perdido, 0 W.O.)" />
                          <StandingColumnHead label="SG" fullName="Sets ganados" />
                          <StandingColumnHead label="SP" fullName="Sets perdidos" />
                          <StandingColumnHead
                            label="Dif. sets"
                            fullName="Diferencia de sets"
                          />
                          <StandingColumnHead
                            label="Dif. games"
                            fullName="Diferencia de games"
                          />
                          <StandingColumnHead
                            label="PJ"
                            fullName="Partidos jugados"
                          />
                          <StandingColumnHead
                            label="PG"
                            fullName="Partidos ganados"
                          />
                          <StandingColumnHead
                            label="Desempate"
                            fullName="Criterio que definió el puesto"
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
                            row.position <= (group.qualifies ?? 0);
                          const tied = tiedSet.has(row.pairId);
                          return (
                            <TableRow
                              key={row.id}
                              className={cn(qualifies && "bg-primary/10", tied && "bg-amber-50")}
                            >
                              <TableCell className="px-2 py-1">
                                {tied ? "?" : row.position || "—"}
                              </TableCell>
                              <TableCell className="px-2 py-1 font-medium">
                                {pairLabels[row.pairId]}
                              </TableCell>
                              <TableCell className="px-2 py-1 font-semibold tabular-nums">
                                {row.points}
                              </TableCell>
                              <TableCell className="px-2 py-1 tabular-nums">
                                {row.setsWon}
                              </TableCell>
                              <TableCell className="px-2 py-1 tabular-nums">
                                {row.setsLost}
                              </TableCell>
                              <TableCell className="px-2 py-1 tabular-nums">
                                {signed(row.setsWon - row.setsLost)}
                              </TableCell>
                              <TableCell className="px-2 py-1 tabular-nums">
                                {signed(row.gamesWon - row.gamesLost)}
                              </TableCell>
                              <TableCell className="px-2 py-1 tabular-nums">
                                {row.played}
                              </TableCell>
                              <TableCell className="px-2 py-1 tabular-nums">
                                {row.won}
                              </TableCell>
                              <TableCell className="px-2 py-1">
                                {row.tieBreak ? (
                                  <Tooltip>
                                    <TooltipTrigger
                                      className="cursor-help"
                                      render={<span />}
                                    >
                                      <span
                                        className={cn(
                                          "inline-flex rounded-md border px-1.5 py-px text-[10px] font-medium",
                                          row.tieBreak === "UNRESOLVED"
                                            ? "border-amber-300 bg-amber-100 text-amber-900"
                                            : row.tieBreak === "MANUAL"
                                              ? "border-sky-300 bg-sky-50 text-sky-900"
                                              : "border-border bg-muted/40 text-muted-foreground",
                                        )}
                                        data-testid={`tiebreak-${row.pairId}`}
                                      >
                                        {tieBreakLabel(row.tieBreak)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      {tieBreakHint(row.tieBreak, row.tieBreakNote)}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              {zoneFinished ? (
                                <TableCell className="px-2 py-1">
                                  {qualifies ? (
                                    <span className="inline-flex rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                                      Clasifica
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground">
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
              ) : null
            }
          >
                  {groupMatches.map((match, index) => {
                    const seedA = pairIndexInGroup(group, match.pairAId);
                    const seedB = pairIndexInGroup(group, match.pairBId);
                    const pendingA = pendingSide(slotSource(slots, match.id, "A"));
                    const pendingB = pendingSide(slotSource(slots, match.id, "B"));
                    const cruce =
                      seedA && seedB
                        ? `${seedA} vs ${seedB}`
                        : pendingA && pendingB
                          ? pendingA === "Ganador"
                            ? "G vs G"
                            : "P vs P"
                          : "—";
                    const playStatus = resolveMatchPlayStatus(match, matchRules);
                    const hasPairs = Boolean(match.pairAId && match.pairBId);
                    const matchCancelled = match.status === "cancelled";
                    const matchClosed =
                      playStatus === "finished" ||
                      match.status === "finished" ||
                      match.status === "walkover" ||
                      matchCancelled;
                    const winnerSide = matchWinnerSide(match);
                    const canOpenResult = canOpenMatchResult(match, !tournamentLocked);
                    const canEditSchedule =
                      hasPairs && !tournamentLocked && !matchClosed;
                    const canEditStatus =
                      hasPairs &&
                      !tournamentLocked &&
                      !matchClosed &&
                      Boolean(onSetStatus);
                    return (
                      <TableRow key={match.id}>
                        <TableCell className="px-2 py-1 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          N°{index + 1}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-xs font-medium whitespace-nowrap">
                          {cruce}
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          {showAgenda && onSaveSchedule ? (
                            <MatchHorarioButton
                              scheduledAt={match.scheduledAt}
                              disabled={!canEditSchedule}
                              onClick={() => setScheduleMatchId(match.id)}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatScheduleShortEs(match.scheduledAt)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-1">
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
                              hint={matchPlayStatusHint(match, slots, pairLabels)}
                              className="h-4 px-1.5 text-[10px]"
                            />
                          </button>
                        </TableCell>
                        <TableCell className="px-2 py-1 whitespace-normal">
                          <PairVsBlock
                            className="text-xs"
                            pairAId={match.pairAId}
                            pairBId={match.pairBId}
                            pairALabel={
                              pairLabels[match.pairAId ?? ""] ?? pendingA ?? "Por definir"
                            }
                            pairBLabel={
                              pairLabels[match.pairBId ?? ""] ?? pendingB ?? "Por definir"
                            }
                            winnerSide={winnerSide}
                            onOpenPair={onOpenPair}
                          />
                        </TableCell>
                        <TableCell className="px-2 py-1 text-left whitespace-normal">
                          <button
                            type="button"
                            data-testid={`match-result-cell-${match.id}`}
                            disabled={!canOpenResult}
                            className={cn(
                              "inline-flex justify-start rounded-md text-left transition-colors",
                              canOpenResult
                                ? "cursor-pointer hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                : "cursor-default",
                            )}
                            onClick={() => {
                              if (!canOpenResult) return;
                              onOpenResult(match);
                            }}
                          >
                            <MatchScoreBoxes
                              sets={match.sets}
                              slotCount={slotCount}
                              decidingSlotIndex={decidingSlotIndex}
                              winnerSide={winnerSide}
                            />
                          </button>
                        </TableCell>
                        {showAgenda && onSaveSchedule ? (
                          <TableCell className="px-2 py-1 align-middle">
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
                        className="px-2 py-1 text-xs text-muted-foreground"
                      >
                        {group.pairIds.length === 1
                          ? `${pairLabels[group.pairIds[0]] ?? "La pareja"} pasa de fase.`
                          : "Sin partidos en esta zona."}
                      </TableCell>
                    </TableRow>
                  ) : null}
          </ZoneSectionFrame>
        );
      })}

      {knockoutPhases.map((phase) => {
        const phaseMatches = scheduleMatches
          .filter((match) => match.phase === phase)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
        const title = roundSectionLabel(phase);
        return (
          <ZoneSectionFrame
            key={phase}
            sectionId={phase}
            title={title}
            testId={`knockout-phase-${phase}`}
            open={sectionOpen(phase)}
            showAgenda={showAgenda}
            onToggle={() => toggleSection(phase)}
          >
            {phaseMatches.map((match, index) => {
              const labelA = sideLabel(match, "A", slots, pairLabels, groupNames);
              const labelB = sideLabel(match, "B", slots, pairLabels, groupNames);
              const playStatus = resolveMatchPlayStatus(match, matchRules);
              const hasPairs = Boolean(match.pairAId && match.pairBId);
              const matchCancelled = match.status === "cancelled";
              const rowClosed =
                playStatus === "finished" ||
                match.status === "finished" ||
                match.status === "walkover" ||
                matchCancelled;
              const winnerSide = matchWinnerSide(match);
              const canOpenResult = canOpenMatchResult(match, !tournamentLocked);
              const canEditSchedule = hasPairs && !tournamentLocked && !rowClosed;
              const canEditStatus =
                hasPairs && !tournamentLocked && !rowClosed && Boolean(onSetStatus);
              return (
                <TableRow key={match.id}>
                  <TableCell className="px-2 py-1 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    N°{index + 1}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs font-medium whitespace-nowrap">
                    —
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    {showAgenda && onSaveSchedule ? (
                      <MatchHorarioButton
                        scheduledAt={match.scheduledAt}
                        disabled={!canEditSchedule}
                        onClick={() => setScheduleMatchId(match.id)}
                      />
                    ) : (
                      <span className="text-xs whitespace-nowrap text-muted-foreground">
                        {formatScheduleShortEs(match.scheduledAt)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1">
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
                        hint={matchPlayStatusHint(match, slots, pairLabels)}
                        className="h-4 px-1.5 text-[10px]"
                      />
                    </button>
                  </TableCell>
                  <TableCell className="px-2 py-1 whitespace-normal">
                    <PairVsBlock
                      className="text-xs"
                      pairAId={match.pairAId}
                      pairBId={match.pairBId}
                      pairALabel={labelA}
                      pairBLabel={labelB}
                      winnerSide={winnerSide}
                      onOpenPair={onOpenPair}
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-left whitespace-normal">
                    <button
                      type="button"
                      data-testid={`match-result-cell-${match.id}`}
                      disabled={!canOpenResult}
                      className={cn(
                        "inline-flex justify-start rounded-md text-left transition-colors",
                        canOpenResult
                          ? "cursor-pointer hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          : "cursor-default",
                      )}
                      onClick={() => {
                        if (!canOpenResult) return;
                        onOpenResult(match);
                      }}
                    >
                      <MatchScoreBoxes
                        sets={match.sets}
                        slotCount={slotCount}
                        decidingSlotIndex={decidingSlotIndex}
                        winnerSide={winnerSide}
                      />
                    </button>
                  </TableCell>
                  {showAgenda && onSaveSchedule ? (
                    <TableCell className="px-2 py-1 align-middle">
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
          </ZoneSectionFrame>
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
            statusMatch
              ? sideLabel(statusMatch, "A", slots, pairLabels, groupNames)
              : "Pareja A"
          }
          pairBLabel={
            statusMatch
              ? sideLabel(statusMatch, "B", slots, pairLabels, groupNames)
              : "Pareja B"
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

      {onResolveTie ? (
        <ResolveTieModal
          open={Boolean(tieGroup && tieForModal)}
          zoneName={tieGroup ? groupNames[tieGroup.id] : "la zona"}
          tiedPairIds={tieForModal?.pairIds ?? []}
          pairLabels={pairLabels}
          standings={tieGroup ? standings.filter((s) => s.groupId === tieGroup.id) : []}
          isSubmitting={tieGroup != null && tieSavingGroupId === tieGroup.id}
          onOpenChange={(open) => {
            if (!open) setTieGroupId(null);
          }}
          onSubmit={async ({ order, note }) => {
            if (!tieGroup) return;
            await onResolveTie({ groupId: tieGroup.id, order, note });
            setTieGroupId(null);
          }}
        />
      ) : null}
    </div>
  );
}
