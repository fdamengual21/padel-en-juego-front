import { useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import type {
  Match,
  MatchRules,
  MatchSlot,
  TournamentGroup,
  TournamentRound,
} from "@core-api";
import { isMatchResultComplete, scoreboardSlotCount } from "@core-api";
import "@xyflow/react/dist/style.css";
import { formatMatchScoreLine } from "@/components/tournaments/Score";
import MatchPlayStatusChip from "@/components/tournaments/MatchPlayStatusChip";
import MatchScoreBoxes from "@/components/tournaments/MatchScoreBoxes";
import PairVsBlock from "@/components/tournaments/PairVsBlock";
import { formatScheduleShortEs } from "@/lib/dates";
import { resolveMatchPlayStatus, type MatchPlayStatus } from "@/lib/matchPlayStatus";
import { roundSectionLabel } from "@/lib/tournamentLabels";
import { cn } from "@/lib/utils";

const MATCH_W = 260;
const MATCH_H = 118;
const ZONE_W = 680;
const COL_GAP = 64;
const ROW_GAP = 28;
const HEADER_H = 44;
const ZONE_HEADER_H = 36;
/** Fila con PairVsBlock (2 líneas) + cuadrados de resultado. */
const ZONE_ROW_H = 56;

interface BracketViewProps {
  rounds: TournamentRound[];
  matches: Match[];
  slots: MatchSlot[];
  pairLabels: Record<string, string>;
  pairPlayerNames?: Record<string, [string, string]>;
  matchRules?: MatchRules;
  groups?: TournamentGroup[];
  groupMatches?: Match[];
  onMatchClick?: (match: Match) => void;
  heightClassName?: string;
}

type MatchNodeData = {
  scheduleLabel: string;
  pairA: string;
  pairB: string;
  scoreLabel: string;
  winnerSide: "A" | "B" | null;
  clickable: boolean;
  finished: boolean;
};

type ZoneRow = {
  n: number;
  vs: string;
  schedule: string;
  matchId: string;
  pairALabel: string;
  pairBLabel: string;
  sets: Match["sets"];
  playStatus: MatchPlayStatus;
  canEdit: boolean;
};

type ZoneNodeData = {
  zoneName: string;
  rows: ZoneRow[];
  slotCount: number;
  decidingSlotIndex: number | null;
  onOpenMatch?: (matchId: string) => void;
};

export function displayZoneName(name: string): string {
  return name.replace(/^Grupo\b/i, "Zona");
}

function pairIndexInGroup(group: TournamentGroup, pairId: string | null): number | null {
  if (!pairId) return null;
  const idx = group.pairIds.indexOf(pairId);
  return idx >= 0 ? idx + 1 : null;
}

function zoneNodeHeight(rowCount: number): number {
  return ZONE_HEADER_H + Math.max(1, rowCount) * ZONE_ROW_H + 2;
}

function BracketMatchNode({ data }: NodeProps) {
  const d = data as MatchNodeData;
  return (
    <div
      className={cn(
        "box-border h-full w-full overflow-hidden rounded-md border-2 border-foreground/80 bg-card text-left shadow-sm",
        d.clickable && "cursor-pointer hover:border-primary",
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-foreground !w-2 !h-2" />
      <div className="bg-muted px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wide">
        {d.scheduleLabel}
      </div>
      <div
        className={cn(
          "border-t border-foreground/20 px-2 py-1.5 text-sm font-medium",
          d.winnerSide === "A" && "bg-primary/15",
        )}
      >
        <p className="truncate">{d.pairA}</p>
      </div>
      <div
        className={cn(
          "border-t border-foreground/20 px-2 py-1.5 text-sm",
          d.winnerSide === "B" ? "bg-primary/15 font-medium" : "text-muted-foreground",
        )}
      >
        <p className="truncate">{d.pairB}</p>
      </div>
      <div className="border-t border-foreground/20 bg-muted/40 px-2 py-1 text-right text-xs font-semibold tabular-nums">
        {d.finished ? d.scoreLabel : d.clickable ? "Cargar resultado" : "—"}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-foreground !w-2 !h-2" />
    </div>
  );
}

function ZoneTableNode({ data }: NodeProps) {
  const d = data as ZoneNodeData;
  return (
    <div
      className="box-border w-full rounded-md border-2 border-foreground/80 bg-card text-left shadow-sm"
      data-testid={`zone-table-node-${d.zoneName}`}
    >
      <Handle type="source" position={Position.Right} className="!bg-foreground !w-2 !h-2" />
      <table className="w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-emerald-100 text-emerald-950">
            <th className="px-1.5 py-2 text-left font-bold uppercase tracking-wide w-[4rem]">
              {d.zoneName}
            </th>
            <th className="px-1.5 py-2 text-left font-bold uppercase tracking-wide whitespace-nowrap">
              Horarios
            </th>
            <th className="px-1.5 py-2 text-left font-bold uppercase tracking-wide whitespace-nowrap">
              Estado
            </th>
            <th className="px-1.5 py-2 text-left font-bold uppercase tracking-wide">Partidos</th>
            <th className="px-1.5 py-2 text-right font-bold uppercase tracking-wide whitespace-nowrap">
              Resultado
            </th>
          </tr>
        </thead>
        <tbody>
          {d.rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-2 py-3 text-muted-foreground">
                Sin partidos en esta zona.
              </td>
            </tr>
          ) : (
            d.rows.map((row) => (
              <tr
                key={row.matchId}
                className={cn(
                  "nodrag nopan border-t border-foreground/15",
                  row.canEdit && "cursor-pointer hover:bg-muted/50",
                )}
                onClick={() => {
                  if (!row.canEdit || !d.onOpenMatch) return;
                  d.onOpenMatch(row.matchId);
                }}
              >
                <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                  <span className="text-muted-foreground">N°{row.n}</span>
                  <span className="ml-1 font-semibold">{row.vs}</span>
                </td>
                <td className="px-1.5 py-1 align-middle whitespace-nowrap text-muted-foreground">
                  {row.schedule}
                </td>
                <td className="px-1.5 py-1 align-middle">
                  <MatchPlayStatusChip
                    status={row.playStatus}
                    className="h-4 px-1.5 text-[10px]"
                  />
                </td>
                <td className="px-1.5 py-1 align-middle">
                  <PairVsBlock
                    className="text-[10px]"
                    pairALabel={row.pairALabel}
                    pairBLabel={row.pairBLabel}
                  />
                </td>
                <td className="px-1.5 py-1 align-middle text-right">
                  <div className="inline-flex justify-end">
                    <MatchScoreBoxes
                      sets={row.sets}
                      slotCount={d.slotCount}
                      decidingSlotIndex={d.decidingSlotIndex}
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function RoundHeaderNode({ data }: NodeProps) {
  const d = data as { label: string; width?: number };
  return (
    <div
      style={{ width: d.width ?? MATCH_W }}
      className="flex items-center justify-center rounded-md bg-sky-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-sky-950"
    >
      {d.label}
    </div>
  );
}

const nodeTypes = {
  bracketMatch: BracketMatchNode,
  zoneTable: ZoneTableNode,
  roundHeader: RoundHeaderNode,
};

function resolvePairLabel(
  match: Match,
  side: "A" | "B",
  slots: MatchSlot[],
  pairLabels: Record<string, string>,
  groupNames: Record<string, string>,
): string {
  const pairId = side === "A" ? match.pairAId : match.pairBId;
  if (pairId && pairLabels[pairId]) return pairLabels[pairId];
  const slot = slots.find((s) => s.matchId === match.id && s.side === side);
  if (!slot) return "Por definir";
  if (slot.sourceType === "GROUP_POSITION" && slot.groupId && slot.groupPosition != null) {
    const zone = groupNames[slot.groupId] ?? "Zona";
    return `${slot.groupPosition}° ${zone}`;
  }
  return "Por definir";
}

const FALLBACK_RULES: MatchRules = {
  setFormat: "best_of_3",
  setsToWin: 2,
  gamesPerSet: 6,
  advantageType: "goldenPoint",
  goldenPoint: true,
  tiebreakEnabled: true,
  tiebreakPoints: 7,
  tiebreakWinByTwo: true,
  superTiebreakEnabled: true,
  superTiebreakPoints: 10,
  superTiebreakWinByTwo: true,
};

export default function BracketView({
  rounds,
  matches,
  slots,
  pairLabels,
  pairPlayerNames = {},
  matchRules = FALLBACK_RULES,
  groups = [],
  groupMatches = [],
  onMatchClick,
  heightClassName = "h-[560px]",
}: BracketViewProps) {
  const groupNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of groups) map[g.id] = displayZoneName(g.name);
    return map;
  }, [groups]);

  const { nodes, edges } = useMemo(() => {
    const sortedRounds = [...rounds].sort((a, b) => a.order - b.order);
    const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
    const elimination = matches.filter((m) => m.phase !== "GROUP");
    const hasZones = sortedGroups.length > 0;
    const slotCount = scoreboardSlotCount(matchRules);
    const decidingSlotIndex =
      matchRules.superTiebreakEnabled && matchRules.setsToWin >= 2 ? slotCount - 1 : null;

    const nodesOut: Node[] = [];
    const edgesOut: Edge[] = [];

    let zonesContentTop = HEADER_H;
    let zonesContentBottom = HEADER_H + MATCH_H * 4;

    if (hasZones) {
      nodesOut.push({
        id: "header-zones",
        type: "roundHeader",
        position: { x: 0, y: 0 },
        data: { label: "Zonas", width: ZONE_W },
        draggable: false,
        selectable: false,
      });

      let zoneY = HEADER_H;
      for (const group of sortedGroups) {
        const zoneMatches = groupMatches
          .filter((m) => m.groupId === group.id && m.phase === "GROUP")
          .sort(
            (a, b) =>
              (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? "") ||
              a.id.localeCompare(b.id),
          );
        const rows: ZoneRow[] = zoneMatches.map((match, index) => {
          const seedA = pairIndexInGroup(group, match.pairAId);
          const seedB = pairIndexInGroup(group, match.pairBId);
          const canEdit = Boolean(match.pairAId && match.pairBId && onMatchClick);
          return {
            n: index + 1,
            vs: seedA && seedB ? `${seedA} vs ${seedB}` : "—",
            schedule: formatScheduleShortEs(match.scheduledAt),
            matchId: match.id,
            pairALabel: pairLabels[match.pairAId ?? ""] ?? "Por definir",
            pairBLabel: pairLabels[match.pairBId ?? ""] ?? "Por definir",
            sets: match.sets,
            playStatus: resolveMatchPlayStatus(match, matchRules),
            canEdit,
          };
        });
        const h = zoneNodeHeight(rows.length);
        const matchByIdLocal = new Map(zoneMatches.map((m) => [m.id, m]));
        nodesOut.push({
          id: `zone-${group.id}`,
          type: "zoneTable",
          position: { x: 0, y: zoneY },
          className: "!overflow-visible",
          style: { width: ZONE_W, height: h },
          data: {
            zoneName: displayZoneName(group.name),
            rows,
            slotCount,
            decidingSlotIndex,
            onOpenMatch: onMatchClick
              ? (matchId: string) => {
                  const m = matchByIdLocal.get(matchId);
                  if (m) onMatchClick(m);
                }
              : undefined,
          } satisfies ZoneNodeData,
          sourcePosition: Position.Right,
          draggable: false,
          selectable: false,
        });
        zoneY += h + ROW_GAP;
      }
      zonesContentTop = HEADER_H;
      zonesContentBottom = Math.max(zonesContentTop + MATCH_H, zoneY - ROW_GAP);
    }

    const zonesContentHeight = zonesContentBottom - zonesContentTop;

    for (const slot of slots) {
      if (slot.sourceType === "MATCH_WINNER" && slot.sourceMatchId) {
        edgesOut.push({
          id: `${slot.sourceMatchId}-${slot.matchId}-${slot.side}`,
          source: slot.sourceMatchId,
          target: slot.matchId,
          type: "smoothstep",
          style: { stroke: "#64748b", strokeWidth: 2 },
        });
      }
    }

    const matchesByRound = new Map<string, Match[]>();
    for (const round of sortedRounds) {
      matchesByRound.set(
        round.id,
        elimination
          .filter((m) => m.roundId === round.id)
          .sort((a, b) => a.id.localeCompare(b.id)),
      );
    }

    const centeredStackYs = (count: number): number[] => {
      if (count <= 0) return [];
      const stackH = count * MATCH_H + Math.max(0, count - 1) * ROW_GAP;
      const startY = zonesContentTop + Math.max(0, (zonesContentHeight - stackH) / 2);
      return Array.from({ length: count }, (_, i) => startY + i * (MATCH_H + ROW_GAP));
    };

    sortedRounds.forEach((round, roundIndex) => {
      const elimX = hasZones
        ? ZONE_W + COL_GAP + roundIndex * (MATCH_W + COL_GAP)
        : roundIndex * (MATCH_W + COL_GAP);

      nodesOut.push({
        id: `header-${round.id}`,
        type: "roundHeader",
        position: { x: elimX, y: 0 },
        data: { label: roundSectionLabel(round.type, round.name), width: MATCH_W },
        draggable: false,
        selectable: false,
      });

      const roundMatches = matchesByRound.get(round.id) ?? [];
      const ys = centeredStackYs(roundMatches.length);
      roundMatches.forEach((match, i) => {
        const y = ys[i] ?? HEADER_H;
        const finished = isMatchResultComplete(match, matchRules);
        nodesOut.push({
          id: match.id,
          type: "bracketMatch",
          position: { x: elimX, y },
          style: { width: MATCH_W, height: MATCH_H },
          data: {
            scheduleLabel: formatScheduleShortEs(match.scheduledAt).toUpperCase(),
            pairA: resolvePairLabel(match, "A", slots, pairLabels, groupNames),
            pairB: resolvePairLabel(match, "B", slots, pairLabels, groupNames),
            scoreLabel: formatMatchScoreLine(match.sets),
            winnerSide:
              match.winnerPairId && match.winnerPairId === match.pairAId
                ? "A"
                : match.winnerPairId && match.winnerPairId === match.pairBId
                  ? "B"
                  : null,
            clickable: Boolean(match.pairAId && match.pairBId && onMatchClick),
            finished,
          } satisfies MatchNodeData,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          draggable: false,
        });
      });
    });

    if (hasZones && sortedRounds[0]) {
      const firstRoundMatches = matchesByRound.get(sortedRounds[0].id) ?? [];
      for (const match of firstRoundMatches) {
        for (const side of ["A", "B"] as const) {
          const slot = slots.find((s) => s.matchId === match.id && s.side === side);
          if (slot?.sourceType === "GROUP_POSITION" && slot.groupId) {
            edgesOut.push({
              id: `zone-${slot.groupId}-${match.id}-${side}`,
              source: `zone-${slot.groupId}`,
              target: match.id,
              type: "smoothstep",
              style: { stroke: "#64748b", strokeWidth: 2 },
            });
          }
        }
      }
    }

    return { nodes: nodesOut, edges: edgesOut };
  }, [
    rounds,
    matches,
    slots,
    pairLabels,
    pairPlayerNames,
    matchRules,
    groups,
    groupMatches,
    onMatchClick,
    groupNames,
  ]);

  const matchById = useMemo(() => {
    const map = new Map<string, Match>();
    for (const m of matches) map.set(m.id, m);
    for (const m of groupMatches) map.set(m.id, m);
    return map;
  }, [matches, groupMatches]);

  return (
    <div className={cn("w-full rounded-xl border border-border", heightClassName)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => {
          if (!onMatchClick || node.type !== "bracketMatch") return;
          const match = matchById.get(node.id);
          if (match?.pairAId && match.pairBId) onMatchClick(match);
        }}
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
