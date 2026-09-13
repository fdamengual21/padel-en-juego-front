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
import { scoreboardSlotCount } from "@core-api";
import "@xyflow/react/dist/style.css";
import RoundMatchesTable, {
  type MatchTableRow,
} from "@/components/tournaments/RoundMatchesTable";
import { formatScheduleShortEs } from "@/lib/dates";
import { resolveMatchPlayStatus } from "@/lib/matchPlayStatus";
import { roundSectionLabel } from "@/lib/tournamentLabels";
import { cn } from "@/lib/utils";

const ZONE_W = 680;
const ROUND_W = 600;
const COL_GAP = 64;
const ROW_GAP = 28;
const HEADER_H = 44;
const TABLE_HEADER_H = 36;
/** Fila con PairVsBlock (2 líneas) + cuadrados de resultado. */
const TABLE_ROW_H = 56;

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

type MatchesTableNodeData = {
  title: string;
  rows: MatchTableRow[];
  slotCount: number;
  decidingSlotIndex: number | null;
  showIndexColumn: boolean;
  showTargetHandle: boolean;
  emptyLabel: string;
  testId: string;
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

function tableNodeHeight(rowCount: number): number {
  return TABLE_HEADER_H + Math.max(1, rowCount) * TABLE_ROW_H + 2;
}

function MatchesTableNode({ data }: NodeProps) {
  const d = data as MatchesTableNodeData;
  return (
    <div
      className="box-border w-full rounded-md border-2 border-foreground/80 bg-card text-left shadow-sm"
      data-testid={d.testId}
    >
      {d.showTargetHandle ? (
        <Handle type="target" position={Position.Left} className="!bg-foreground !w-2 !h-2" />
      ) : null}
      <Handle type="source" position={Position.Right} className="!bg-foreground !w-2 !h-2" />
      <RoundMatchesTable
        title={d.title}
        rows={d.rows}
        slotCount={d.slotCount}
        decidingSlotIndex={d.decidingSlotIndex}
        showIndexColumn={d.showIndexColumn}
        emptyLabel={d.emptyLabel}
        onOpenMatch={d.onOpenMatch}
      />
    </div>
  );
}

function RoundHeaderNode({ data }: NodeProps) {
  const d = data as { label: string; width?: number };
  return (
    <div
      style={{ width: d.width ?? ROUND_W }}
      className="flex items-center justify-center rounded-md bg-sky-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-sky-950"
    >
      {d.label}
    </div>
  );
}

const nodeTypes = {
  matchesTable: MatchesTableNode,
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

const EDGE_STYLE = { stroke: "#64748b", strokeWidth: 2 };

function openMatchHandler(
  matches: Match[],
  onMatchClick?: (match: Match) => void,
): ((matchId: string) => void) | undefined {
  if (!onMatchClick) return undefined;
  const matchById = new Map(matches.map((m) => [m.id, m]));
  return (matchId: string) => {
    const match = matchById.get(matchId);
    if (match) onMatchClick(match);
  };
}

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
    const edgeIds = new Set<string>();

    const addEdge = (id: string, source: string, target: string) => {
      if (edgeIds.has(id)) return;
      edgeIds.add(id);
      edgesOut.push({
        id,
        source,
        target,
        type: "smoothstep",
        style: EDGE_STYLE,
      });
    };

    let zonesContentTop = HEADER_H;
    let zonesContentBottom = HEADER_H + TABLE_ROW_H * 4;

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
        const rows: MatchTableRow[] = zoneMatches.map((match, index) => {
          const seedA = pairIndexInGroup(group, match.pairAId);
          const seedB = pairIndexInGroup(group, match.pairBId);
          return {
            n: index + 1,
            vs: seedA && seedB ? `${seedA} vs ${seedB}` : "—",
            schedule: formatScheduleShortEs(match.scheduledAt),
            matchId: match.id,
            pairALabel: pairLabels[match.pairAId ?? ""] ?? "Por definir",
            pairBLabel: pairLabels[match.pairBId ?? ""] ?? "Por definir",
            sets: match.sets,
            playStatus: resolveMatchPlayStatus(match, matchRules),
            canEdit: Boolean(match.pairAId && match.pairBId && onMatchClick),
          };
        });
        const h = tableNodeHeight(rows.length);
        nodesOut.push({
          id: `zone-${group.id}`,
          type: "matchesTable",
          position: { x: 0, y: zoneY },
          className: "!overflow-visible",
          style: { width: ZONE_W, height: h },
          data: {
            title: displayZoneName(group.name),
            rows,
            slotCount,
            decidingSlotIndex,
            showIndexColumn: true,
            showTargetHandle: false,
            emptyLabel: "Sin partidos en esta zona.",
            testId: `zone-table-node-${displayZoneName(group.name)}`,
            onOpenMatch: openMatchHandler(zoneMatches, onMatchClick),
          } satisfies MatchesTableNodeData,
          sourcePosition: Position.Right,
          draggable: false,
          selectable: false,
        });
        zoneY += h + ROW_GAP;
      }
      zonesContentTop = HEADER_H;
      zonesContentBottom = Math.max(zonesContentTop + TABLE_ROW_H, zoneY - ROW_GAP);
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

    const roundHeights = sortedRounds.map((round) =>
      tableNodeHeight((matchesByRound.get(round.id) ?? []).length),
    );
    const referenceHeight = hasZones
      ? zonesContentBottom - zonesContentTop
      : Math.max(TABLE_ROW_H, ...roundHeights);

    sortedRounds.forEach((round, roundIndex) => {
      const elimX = hasZones
        ? ZONE_W + COL_GAP + roundIndex * (ROUND_W + COL_GAP)
        : roundIndex * (ROUND_W + COL_GAP);
      const roundLabel = roundSectionLabel(round.type, round.name);
      const roundMatches = matchesByRound.get(round.id) ?? [];
      const rows: MatchTableRow[] = roundMatches.map((match, index) => ({
        n: index + 1,
        vs: "—",
        schedule: formatScheduleShortEs(match.scheduledAt),
        matchId: match.id,
        pairALabel: resolvePairLabel(match, "A", slots, pairLabels, groupNames),
        pairBLabel: resolvePairLabel(match, "B", slots, pairLabels, groupNames),
        sets: match.sets,
        playStatus: resolveMatchPlayStatus(match, matchRules),
        canEdit: Boolean(match.pairAId && match.pairBId && onMatchClick),
      }));
      const h = tableNodeHeight(rows.length);
      const y = HEADER_H + Math.max(0, (referenceHeight - h) / 2);

      nodesOut.push({
        id: `header-${round.id}`,
        type: "roundHeader",
        position: { x: elimX, y: 0 },
        data: { label: roundLabel, width: ROUND_W },
        draggable: false,
        selectable: false,
      });

      nodesOut.push({
        id: `round-${round.id}`,
        type: "matchesTable",
        position: { x: elimX, y },
        className: "!overflow-visible",
        style: { width: ROUND_W, height: h },
        data: {
          title: roundLabel,
          rows,
          slotCount,
          decidingSlotIndex,
          showIndexColumn: false,
          showTargetHandle: hasZones || roundIndex > 0,
          emptyLabel: "Sin partidos en esta ronda.",
          testId: `round-table-node-${round.type}`,
          onOpenMatch: openMatchHandler(roundMatches, onMatchClick),
        } satisfies MatchesTableNodeData,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        draggable: false,
        selectable: false,
      });
    });

    const matchRoundNodeId = new Map<string, string>();
    for (const round of sortedRounds) {
      for (const match of matchesByRound.get(round.id) ?? []) {
        matchRoundNodeId.set(match.id, `round-${round.id}`);
      }
    }

    for (const slot of slots) {
      if (slot.sourceType === "MATCH_WINNER" && slot.sourceMatchId) {
        const source = matchRoundNodeId.get(slot.sourceMatchId);
        const target = matchRoundNodeId.get(slot.matchId);
        if (source && target && source !== target) {
          addEdge(`${source}-${target}`, source, target);
        }
      }
      if (slot.sourceType === "GROUP_POSITION" && slot.groupId) {
        const target = matchRoundNodeId.get(slot.matchId);
        if (target) {
          addEdge(`zone-${slot.groupId}-${target}`, `zone-${slot.groupId}`, target);
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

  return (
    <div className={cn("w-full rounded-xl border border-border", heightClassName)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18, minZoom: 0.4 }}
        minZoom={0.25}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
