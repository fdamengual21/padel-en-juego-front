import { Pencil } from "lucide-react";
import type { Match } from "@/domain";
import MatchPlayStatusChip from "@/components/tournaments/MatchPlayStatusChip";
import MatchScoreBoxes from "@/components/tournaments/MatchScoreBoxes";
import PairVsBlock from "@/components/tournaments/PairVsBlock";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MatchPlayStatus } from "@/lib/matchPlayStatus";
import { cn } from "@/lib/utils";

export interface MatchTableRow {
  n: number;
  vs: string;
  schedule: string;
  matchId: string;
  pairAId?: string | null;
  pairBId?: string | null;
  pairALabel: string;
  pairBLabel: string;
  sets: Match["sets"];
  winnerSide?: "A" | "B" | null;
  playStatus: MatchPlayStatus;
  /** Tooltip del estado (p. ej. por qué clasificó sin jugar). */
  statusHint?: string | null;
  /** La fila abre el marcador, para cargarlo o solo verlo. */
  canOpen: boolean;
  /** El club fijó este cruce a mano. */
  pairingManual?: boolean;
  pairingNote?: string | null;
  /** Por qué no se puede modificar el cruce. Null si se puede. Undefined: sin opción de cruce manual. */
  pairingBlockedReason?: string | null;
}

interface RoundMatchesTableProps {
  title: string;
  rows: MatchTableRow[];
  slotCount: number;
  decidingSlotIndex: number | null;
  /** Columna N° / 1 vs 2 (solo zonas). */
  showIndexColumn?: boolean;
  emptyLabel?: string;
  onOpenMatch?: (matchId: string) => void;
  onOpenPair?: (pairId: string) => void;
  /** Cruce manual (eliminación). Si falta, no se muestra el lápiz. */
  onEditPairing?: (matchId: string) => void;
}

export default function RoundMatchesTable({
  title,
  rows,
  slotCount,
  decidingSlotIndex,
  showIndexColumn = true,
  emptyLabel = "Sin partidos.",
  onOpenMatch,
  onOpenPair,
  onEditPairing,
}: RoundMatchesTableProps) {
  const colCount = showIndexColumn ? 5 : 4;

  return (
    <table className="w-full border-collapse text-[10px]">
      <thead>
        <tr className="bg-emerald-100 text-emerald-950">
          {showIndexColumn ? (
            <th className="px-1.5 py-2 text-left font-bold uppercase tracking-wide w-[4rem]">
              {title}
            </th>
          ) : null}
          <th className="px-1.5 py-2 text-left font-bold uppercase tracking-wide whitespace-nowrap">
            Horarios
          </th>
          <th className="px-1.5 py-2 text-left font-bold uppercase tracking-wide whitespace-nowrap">
            Estado
          </th>
          <th className="px-1.5 py-2 text-left font-bold uppercase tracking-wide">
            Partidos
          </th>
          <th className="px-1.5 py-2 text-right font-bold uppercase tracking-wide whitespace-nowrap">
            Resultado
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={colCount} className="px-2 py-3 text-muted-foreground">
              {emptyLabel}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={row.matchId}
              className={cn(
                "nodrag nopan border-t border-foreground/15",
                row.canOpen && "cursor-pointer hover:bg-muted/50",
              )}
              onClick={() => {
                if (!row.canOpen || !onOpenMatch) return;
                onOpenMatch(row.matchId);
              }}
            >
              {showIndexColumn ? (
                <td className="px-1.5 py-1 align-middle whitespace-nowrap">
                  <span className="text-muted-foreground">N°{row.n}</span>
                  <span className="ml-1 font-semibold">{row.vs}</span>
                </td>
              ) : null}
              <td className="px-1.5 py-1 align-middle whitespace-nowrap text-muted-foreground">
                {row.schedule}
              </td>
              <td className="px-1.5 py-1 align-middle">
                <MatchPlayStatusChip
                  status={row.playStatus}
                  hint={row.statusHint}
                  className="h-4 px-1.5 text-[10px]"
                />
              </td>
              <td className="px-1.5 py-1 align-middle">
                <div className="flex items-center gap-1.5">
                  <PairVsBlock
                    className="text-[10px]"
                    pairAId={row.pairAId}
                    pairBId={row.pairBId}
                    pairALabel={row.pairALabel}
                    pairBLabel={row.pairBLabel}
                    winnerSide={row.winnerSide}
                    onOpenPair={onOpenPair}
                  />
                  {row.pairingManual ? (
                    <TooltipProvider delay={200}>
                      <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex" />}>
                          <span
                            className="rounded border border-amber-300 bg-amber-50 px-1 py-px text-[9px] font-medium text-amber-900"
                            data-testid={`pairing-manual-${row.matchId}`}
                          >
                            Manual
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {row.pairingNote
                            ? `Cruce fijado por el club: ${row.pairingNote}`
                            : "Cruce fijado por el club. El motor no lo recalcula."}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                  {onEditPairing && row.pairingBlockedReason !== undefined ? (
                    <TooltipProvider delay={200}>
                      <Tooltip>
                        <TooltipTrigger render={<span className="ml-auto inline-flex" />}>
                          <button
                            type="button"
                            aria-label="Modificar cruce"
                            data-testid={`edit-pairing-${row.matchId}`}
                            disabled={row.pairingBlockedReason != null}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (row.pairingBlockedReason != null) return;
                              onEditPairing(row.matchId);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {row.pairingBlockedReason ?? "Modificar cruce: elegir a mano las dos parejas."}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </div>
              </td>
              <td className="px-1.5 py-1 align-middle text-right">
                <div className="inline-flex justify-end">
                  <MatchScoreBoxes
                    sets={row.sets}
                    slotCount={slotCount}
                    decidingSlotIndex={decidingSlotIndex}
                    winnerSide={row.winnerSide}
                  />
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
