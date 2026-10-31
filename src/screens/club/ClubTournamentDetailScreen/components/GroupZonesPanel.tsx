import { useState, type ReactNode } from "react";
import { ChevronDown, Info, Pencil, Users } from "lucide-react";
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
  knockoutRebuildBlockedReason,
  matchLiveAction,
  matchMoveBlockedReason,
  matchPairingBlockedReason,
  matchWinnerSide,
  qualifyChangeBlockedReason,
  scoreboardSlotCount,
  tieBreakHint,
  tieBreakLabel,
} from "@/domain";
import MatchCourtSelect, {
  MatchHorarioButton,
  MatchScheduleTimeModal,
} from "./MatchScheduleCell";
import MatchPairingModal from "./MatchPairingModal";
import MovePairPhaseModal from "./MovePairPhaseModal";
import QualifyPairModal from "./QualifyPairModal";
import ResolveTieModal from "./ResolveTieModal";
import { EmptyState } from "@/components/EmptyState";
import MatchLiveButton from "@/components/tournaments/MatchLiveButton";
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
        <TooltipContent className="max-w-xs">{fullName}</TooltipContent>
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
  /** Quality: GET de ocupación al elegir fecha y hora. */
  showCourtOccupancy?: boolean;
  /** Quality: se ve el horario, no se puede cargar fecha/hora a mano. */
  disableMatchDateTime?: boolean;
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
  tournamentStarted?: boolean;
  onSetPairing?: (input: {
    matchId: string;
    pairAId: string | null;
    pairBId: string | null;
    note: string | null;
  }) => Promise<void> | void;
  pairingSavingMatchId?: string | null;
  onMovePair?: (input: {
    pairId: string;
    phase?: MatchPhase;
    groupId?: string;
  }) => Promise<void> | void;
  moveSaving?: boolean;
  onQualifyPair?: (input: { matchId: string; pairId: string | null }) => Promise<void> | void;
  qualifySaving?: boolean;
}

const STANDINGS_HINT =
  "Se ordena por puntos de zona: 2 si ganó el partido, 1 si lo perdió jugando, 0 si no se presentó (W.O.). Entre dos empatadas, el partido directo; entre tres o más, sets y games solo entre ellas, luego games de toda la zona. Si todo sigue igual, el club sortea desde acá.";

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
  if (source === "BYE") return "Sin rival";
  return null;
}

function pairNamesFromLabel(
  pairId: string,
  pairLabels: Record<string, string>,
  pairPlayerNames?: Record<string, [string, string]>,
): [string, string] {
  const named = pairPlayerNames?.[pairId];
  if (named?.[0]) return named;
  const label = pairLabels[pairId];
  if (!label) return ["Pareja", ""];
  const parts = label.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  return [label, ""];
}

function MatchRowActions({
  matchId,
  pairingBlockedReason,
  liveKind,
  liveBlockedReason,
  liveSaving,
  moveBlockedReason,
  onEditPairing,
  onSetLive,
  onMovePair,
}: {
  matchId: string;
  pairingBlockedReason?: string | null;
  liveKind?: "play" | "pause";
  liveBlockedReason?: string | null;
  liveSaving?: boolean;
  moveBlockedReason?: string | null;
  onEditPairing?: (matchId: string) => void;
  onSetLive?: (matchId: string, status: "scheduled" | "inProgress") => void;
  onMovePair?: (matchId: string) => void;
}) {
  if (!onEditPairing && !onSetLive && !onMovePair) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {onEditPairing && pairingBlockedReason !== undefined ? (
        <TooltipProvider delay={200}>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <button
                type="button"
                aria-label="Modificar cruce"
                data-testid={`edit-pairing-${matchId}`}
                disabled={pairingBlockedReason != null}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                onClick={(event) => {
                  event.stopPropagation();
                  if (pairingBlockedReason != null) return;
                  onEditPairing(matchId);
                }}
              >
                <Pencil className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {pairingBlockedReason ?? "Modificar cruce: elegir a mano las dos parejas."}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
      {onSetLive && liveKind ? (
        <MatchLiveButton
          matchId={matchId}
          kind={liveKind}
          blockedReason={liveBlockedReason ?? null}
          isSaving={liveSaving}
          onPlay={(id) => onSetLive(id, "inProgress")}
          onPause={(id) => onSetLive(id, "scheduled")}
        />
      ) : null}
      {onMovePair && moveBlockedReason !== undefined ? (
        <TooltipProvider delay={200}>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <button
                type="button"
                data-testid={`move-pair-${matchId}`}
                disabled={moveBlockedReason != null}
                className="whitespace-nowrap rounded px-1 py-px text-[9px] font-medium text-primary-strong hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                onClick={(event) => {
                  event.stopPropagation();
                  if (moveBlockedReason != null) return;
                  onMovePair(matchId);
                }}
              >
                Mover
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {moveBlockedReason ?? "Mover una pareja a otra ronda o zona."}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}

function slotSource(slots: MatchSlot[], matchId: string, side: "A" | "B") {
  return slots.find((slot) => slot.matchId === matchId && slot.side === side)?.sourceType;
}

function qualifyHeadline(count: number): string | null {
  if (count === 0) return "El 1° es campeón";
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

function pairsLabel(count: number): string {
  return count === 1 ? "1 pareja" : `${count} parejas`;
}

interface ZoneSectionFrameProps {
  sectionId: string;
  title: string;
  testId: string;
  open: boolean;
  showAgenda: boolean;
  showActions?: boolean;
  onToggle: () => void;
  children: ReactNode;
  footer?: ReactNode;
  pairCount?: number;
}

function ZoneSectionFrame({
  sectionId,
  title,
  testId,
  open,
  showAgenda,
  showActions = false,
  onToggle,
  children,
  footer,
  pairCount,
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
        <Table className={cn("table-fixed text-xs", showActions ? "min-w-[41.3rem]" : "min-w-[35.3rem]")}>
          <colgroup>
            <col className="w-[2.5rem]" />
            <col className="w-[4rem]" />
            <col className="w-[7.25rem]" />
            <col className="w-[6.25rem]" />
            <col className="w-[17rem]" />
            <col className="w-[6.3rem]" />
            {showActions ? <col className="w-[5.5rem]" /> : null}
            {showAgenda ? <col className="w-[7.5rem]" /> : null}
          </colgroup>
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead colSpan={2} className={cn(headClass, "whitespace-nowrap")}>
                <span className="inline-flex items-center gap-1.5">
                  {title}
                  {pairCount != null ? (
                    <TooltipProvider delay={200}>
                      <Tooltip>
                        <TooltipTrigger
                          className="cursor-help"
                          render={<span />}
                        >
                          <span
                            className="inline-flex h-5 items-center rounded-md bg-primary-foreground/20 px-1.5 text-[10px] font-semibold tabular-nums"
                            data-testid={`zone-pair-count-${sectionId}`}
                          >
                            {pairCount}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{pairsLabel(pairCount)}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </span>
              </TableHead>
              <TableHead className={headClass}>Horarios</TableHead>
              <TableHead className={headClass}>Estado</TableHead>
              <TableHead className={headClass}>Partidos</TableHead>
              <TableHead
                className={cn(
                  headClass,
                  "text-left",
                  !showAgenda && !showActions && "pr-8",
                )}
              >
                Resultado
              </TableHead>
              {showActions ? (
                <TableHead className={cn(headClass, !showAgenda && "pr-8")}>
                  Acciones
                </TableHead>
              ) : null}
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
  pairPlayerNames = {},
  matchRules,
  courts = [],
  allMatches,
  slots = [],
  reservations = [],
  matchDurationMinutes,
  showCourtOccupancy = false,
  disableMatchDateTime = false,
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
  tournamentStarted = false,
  onSetPairing,
  pairingSavingMatchId = null,
  onMovePair,
  moveSaving = false,
  onQualifyPair,
  qualifySaving = false,
}: GroupZonesPanelProps) {
  const [scheduleMatchId, setScheduleMatchId] = useState<string | null>(null);
  const [tieGroupId, setTieGroupId] = useState<string | null>(null);
  const [pairingMatchId, setPairingMatchId] = useState<string | null>(null);
  const [movingMatchId, setMovingMatchId] = useState<string | null>(null);
  const [qualifyingMatchId, setQualifyingMatchId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const tieByGroup = new Map(unresolvedTies.map((tie) => [tie.groupId, tie]));
  const tieGroup = tieGroupId ? (groups.find((g) => g.id === tieGroupId) ?? null) : null;
  const tieForModal = tieGroupId ? (tieByGroup.get(tieGroupId) ?? null) : null;
  const finishedGroupSet = new Set(finishedGroupIds);
  const scheduleMatches = allMatches ?? matches;
  const knockoutPhases = visibleKnockoutPhases(scheduleMatches);
  const movePhases = KNOCKOUT_PHASES.filter((phase) =>
    scheduleMatches.some((match) => match.phase === phase),
  );
  const canEditPairing = Boolean(onSetPairing) && !tournamentLocked;
  const canMovePairs = Boolean(onMovePair) && !tournamentLocked && tournamentStarted;
  const canSetLive = Boolean(onSetStatus) && !tournamentLocked;
  const showMatchActions = canEditPairing || canMovePairs || canSetLive;
  const rebuildBlockedReason = knockoutRebuildBlockedReason(scheduleMatches, slots);
  const groupNames: Record<string, string> = {};
  for (const group of groups) {
    groupNames[group.id] = group.name.replace(/^Grupo\b/i, "Zona");
  }

  if (!groups.length && knockoutPhases.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Todavía no hay parejas inscriptas"
        description="Cuando los jugadores se inscriban, se generarán las zonas y se completará el cuadro del torneo."
        className={compact ? "min-h-0 py-8" : undefined}
      />
    );
  }

  const slotCount = scoreboardSlotCount(matchRules);
  const decidingSlotIndex =
    matchRules.superTiebreakEnabled && matchRules.setsToWin >= 2 ? slotCount - 1 : null;
  const showAgenda = Boolean(onSaveSchedule) && !compact;
  const matchColCount = 6 + (showAgenda ? 1 : 0) + (showMatchActions ? 1 : 0);
  const sectionOpen = (id: string) => collapsed[id] !== true;
  const toggleSection = (id: string) =>
    setCollapsed((current) => ({ ...current, [id]: !current[id] }));
  const scheduleMatch =
    scheduleMatchId != null
      ? (scheduleMatches.find((m) => m.id === scheduleMatchId) ?? null)
      : null;
  const pairingMatch =
    pairingMatchId != null
      ? (scheduleMatches.find((m) => m.id === pairingMatchId) ?? null)
      : null;
  const movingMatch =
    movingMatchId != null
      ? (scheduleMatches.find((m) => m.id === movingMatchId) ?? null)
      : null;
  const movingPairs = [movingMatch?.pairAId, movingMatch?.pairBId]
    .filter((id): id is string => Boolean(id))
    .map((pairId) => ({
      pairId,
      names: pairNamesFromLabel(pairId, pairLabels, pairPlayerNames),
    }));
  const qualifyingMatch =
    qualifyingMatchId != null
      ? (scheduleMatches.find((match) => match.id === qualifyingMatchId) ?? null)
      : null;
  const qualifyingPairs = [qualifyingMatch?.pairAId, qualifyingMatch?.pairBId]
    .filter((id): id is string => Boolean(id))
    .map((pairId) => ({
      pairId,
      names: pairNamesFromLabel(pairId, pairLabels, pairPlayerNames),
    }));
  const qualifyingLockedReason = qualifyingMatch
    ? qualifyChangeBlockedReason(qualifyingMatch, scheduleMatches, slots)
    : null;
  const nextQualifyIndex =
    qualifyingMatch != null ? knockoutPhases.indexOf(qualifyingMatch.phase) : -1;
  const nextQualifyPhase =
    nextQualifyIndex >= 0 ? knockoutPhases[nextQualifyIndex + 1] : undefined;
  const knockoutPairingCandidates = [
    ...new Set([
      ...groups.flatMap((group) => group.pairIds),
      ...scheduleMatches.flatMap((match) =>
        [match.pairAId, match.pairBId].filter((id): id is string => Boolean(id)),
      ),
    ]),
  ];
  const moveGroups = groups.map((group) => ({
    id: group.id,
    name: groupNames[group.id] ?? group.name,
    pairCount: group.pairIds.length,
  }));
  const pairGroupIds = Object.fromEntries(
    groups.flatMap((group) => group.pairIds.map((pairId) => [pairId, group.id])),
  );

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
            showActions={showMatchActions}
            pairCount={group.pairIds.length}
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
                          <StandingColumnHead
                            label="Pts"
                            fullName="Puntos de zona, por partido: 2 si ganó, 1 si lo perdió jugando, 0 si no se presentó (W.O.). No suman sets, games ni el tie-break."
                          />
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
                          {zoneFinished && (group.qualifies ?? 0) > 0 ? (
                            <StandingColumnHead
                              label="Avance"
                              fullName="Clasificación al cuadro"
                            />
                          ) : zoneFinished ? (
                            <StandingColumnHead
                              label="Resultado"
                              fullName="Campeón de la zona"
                            />
                          ) : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupStandings.map((row) => {
                          const qualifies =
                            zoneFinished &&
                            (group.qualifies ?? 0) > 0 &&
                            row.position > 0 &&
                            row.position <= (group.qualifies ?? 0);
                          const champion =
                            zoneFinished &&
                            (group.qualifies ?? 0) === 0 &&
                            row.position === 1;
                          const tied = tiedSet.has(row.pairId);
                          return (
                            <TableRow
                              key={row.id}
                              className={cn(
                                (qualifies || champion) && "bg-primary/10",
                                tied && "bg-amber-50",
                              )}
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
                              {zoneFinished && (group.qualifies ?? 0) > 0 ? (
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
                              ) : zoneFinished ? (
                                <TableCell className="px-2 py-1">
                                  {champion ? (
                                    <span
                                      className="inline-flex rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground"
                                      data-testid="standing-champion"
                                    >
                                      Campeón
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
                    const canEditDateTime = canEditSchedule && !disableMatchDateTime;
                    const live = canSetLive ? matchLiveAction(match, tournamentStarted) : null;
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
                              disabled={!canEditDateTime}
                              onClick={() => setScheduleMatchId(match.id)}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatScheduleShortEs(match.scheduledAt)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <MatchPlayStatusChip
                            status={playStatus}
                            hint={matchPlayStatusHint(match, slots, pairLabels)}
                            className="h-4 px-1.5 text-[10px]"
                          />
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
                        {showMatchActions ? (
                          <TableCell className="px-2 py-1 align-middle">
                            <MatchRowActions
                              matchId={match.id}
                              pairingBlockedReason={
                                canEditPairing
                                  ? matchPairingBlockedReason(match, slots, tournamentStarted)
                                  : undefined
                              }
                              liveKind={live?.kind}
                              liveBlockedReason={live?.blockedReason}
                              liveSaving={statusSavingMatchId === match.id}
                              moveBlockedReason={
                                canMovePairs
                                  ? matchMoveBlockedReason(
                                      match,
                                      slots,
                                      tournamentStarted,
                                      rebuildBlockedReason,
                                      scheduleMatches,
                                    )
                                  : undefined
                              }
                              onEditPairing={canEditPairing ? setPairingMatchId : undefined}
                              onSetLive={
                                canSetLive && onSetStatus
                                  ? (id, status) => {
                                      void onSetStatus({ matchId: id, status });
                                    }
                                  : undefined
                              }
                              onMovePair={canMovePairs ? setMovingMatchId : undefined}
                            />
                          </TableCell>
                        ) : null}
                        {showAgenda && onSaveSchedule ? (
                          <TableCell className="px-2 py-1 align-middle">
                            <MatchCourtSelect
                              match={match}
                              courts={courts}
                              pairLabels={pairLabels}
                              allMatches={scheduleMatches}
                              reservations={reservations}
                              matchDurationMinutes={matchDurationMinutes}
                              showCourtOccupancy={showCourtOccupancy}
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
                        colSpan={matchColCount}
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
            showActions={showMatchActions}
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
              const canEditDateTime = canEditSchedule && !disableMatchDateTime;
              const live = canSetLive ? matchLiveAction(match, tournamentStarted) : null;
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
                        disabled={!canEditDateTime}
                        onClick={() => setScheduleMatchId(match.id)}
                      />
                    ) : (
                      <span className="text-xs whitespace-nowrap text-muted-foreground">
                        {formatScheduleShortEs(match.scheduledAt)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <MatchPlayStatusChip
                      status={playStatus}
                      hint={matchPlayStatusHint(match, slots, pairLabels)}
                      className="h-4 px-1.5 text-[10px]"
                    />
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
                  {showMatchActions ? (
                    <TableCell className="px-2 py-1 align-middle">
                      <MatchRowActions
                        matchId={match.id}
                        pairingBlockedReason={
                          canEditPairing
                            ? matchPairingBlockedReason(match, slots, tournamentStarted)
                            : undefined
                        }
                        liveKind={live?.kind}
                        liveBlockedReason={live?.blockedReason}
                        liveSaving={statusSavingMatchId === match.id}
                        moveBlockedReason={
                          canMovePairs
                            ? matchMoveBlockedReason(
                                match,
                                slots,
                                tournamentStarted,
                                rebuildBlockedReason,
                                scheduleMatches,
                              )
                            : undefined
                        }
                        onEditPairing={canEditPairing ? setPairingMatchId : undefined}
                        onSetLive={
                          canSetLive && onSetStatus
                            ? (id, status) => {
                                void onSetStatus({ matchId: id, status });
                              }
                            : undefined
                        }
                        onMovePair={canMovePairs ? setMovingMatchId : undefined}
                      />
                    </TableCell>
                  ) : null}
                  {showAgenda && onSaveSchedule ? (
                    <TableCell className="px-2 py-1 align-middle">
                      <MatchCourtSelect
                        match={match}
                        courts={courts}
                        pairLabels={pairLabels}
                        allMatches={scheduleMatches}
                        reservations={reservations}
                        matchDurationMinutes={matchDurationMinutes}
                        showCourtOccupancy={showCourtOccupancy}
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

      {onSaveSchedule && !disableMatchDateTime ? (
        <MatchScheduleTimeModal
          open={Boolean(scheduleMatch)}
          match={scheduleMatch}
          courts={courts}
          pairLabels={pairLabels}
          allMatches={scheduleMatches}
          reservations={reservations}
          matchDurationMinutes={matchDurationMinutes}
          showCourtOccupancy={showCourtOccupancy}
          isSaving={
            scheduleMatch != null && scheduleSavingMatchId === scheduleMatch.id
          }
          onOpenChange={(open) => {
            if (!open) setScheduleMatchId(null);
          }}
          onSave={onSaveSchedule}
        />
      ) : null}

      {onSetPairing ? (
        <MatchPairingModal
          open={Boolean(pairingMatch)}
          match={pairingMatch}
          roundLabel={
            pairingMatch?.phase === "GROUP" && pairingMatch.groupId
              ? (groupNames[pairingMatch.groupId] ?? "Zona")
              : pairingMatch
                ? roundSectionLabel(pairingMatch.phase)
                : "Ronda"
          }
          roundMatches={
            pairingMatch?.phase === "GROUP" && pairingMatch.groupId
              ? scheduleMatches.filter(
                  (item) => item.groupId === pairingMatch.groupId && item.phase === "GROUP",
                )
              : pairingMatch
                ? scheduleMatches.filter((item) => item.phase === pairingMatch.phase)
                : []
          }
          candidateIds={
            pairingMatch?.phase === "GROUP" && pairingMatch.groupId
              ? (groups.find((group) => group.id === pairingMatch.groupId)?.pairIds ?? [])
              : knockoutPairingCandidates
          }
          pairLabels={pairLabels}
          isSubmitting={pairingMatch != null && pairingSavingMatchId === pairingMatch.id}
          onOpenChange={(open) => {
            if (!open) setPairingMatchId(null);
          }}
          onSubmit={async ({ pairAId, pairBId, note }) => {
            if (!pairingMatch) return;
            await onSetPairing({ matchId: pairingMatch.id, pairAId, pairBId, note });
            setPairingMatchId(null);
          }}
          onQualify={
            onQualifyPair && pairingMatch?.roundId
              ? () => {
                  setQualifyingMatchId(pairingMatch.id);
                  setPairingMatchId(null);
                }
              : undefined
          }
        />
      ) : null}

      {onQualifyPair ? (
        <QualifyPairModal
          open={Boolean(qualifyingMatch)}
          roundLabel={
            qualifyingMatch
              ? roundSectionLabel(qualifyingMatch.phase)
              : "esta ronda"
          }
          nextRoundLabel={nextQualifyPhase ? roundSectionLabel(nextQualifyPhase) : null}
          pairs={qualifyingPairs}
          isSubmitting={qualifySaving}
          lockedReason={qualifyingLockedReason}
          alreadyClassified={qualifyingMatch?.status === "walkover"}
          initialPairId={
            qualifyingMatch?.winnerPairId ??
            qualifyingMatch?.pairAId ??
            qualifyingMatch?.pairBId
          }
          onOpenChange={(open) => {
            if (!open) setQualifyingMatchId(null);
          }}
          onSubmit={async (pairId) => {
            if (!qualifyingMatch) return;
            if (pairId == null && qualifyingMatch.status !== "walkover") {
              setQualifyingMatchId(null);
              return;
            }
            await onQualifyPair({ matchId: qualifyingMatch.id, pairId });
            setQualifyingMatchId(null);
          }}
        />
      ) : null}

      {onMovePair ? (
        <MovePairPhaseModal
          open={Boolean(movingMatch)}
          pairs={movingPairs}
          currentPhase={movingMatch?.phase ?? null}
          phases={movePhases}
          groups={moveGroups}
          currentGroupId={movingMatch?.groupId ?? null}
          pairGroupIds={pairGroupIds}
          isSubmitting={moveSaving}
          onOpenChange={(open) => {
            if (!open) setMovingMatchId(null);
          }}
          onSubmit={async ({ pairId, phase, groupId }) => {
            await onMovePair({ pairId, phase, groupId });
            setMovingMatchId(null);
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
