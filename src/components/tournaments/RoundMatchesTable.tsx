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

/** Horarios/cancha: 10% menos que 6.5rem. */
const CANCHA_COL = "w-[5.85rem]";
/** Partidos: 10% menos que 16.35rem. Resultado queda con el resto. */
const PARTIDOS_COL = "w-[14.72rem]";
const COL_COUNT = 4;

export interface MatchTableRow {
  schedule: string;
  court: string;
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
}

interface RoundMatchesTableProps {
  /** Encabezado de zona, encima de las columnas. En knockout no se usa. */
  title?: string | null;
  rows: MatchTableRow[];
  slotCount: number;
  decidingSlotIndex: number | null;
  emptyLabel?: string;
  onOpenMatch?: (matchId: string) => void;
  onOpenPair?: (pairId: string) => void;
}

export default function RoundMatchesTable({
  title = null,
  rows,
  slotCount,
  decidingSlotIndex,
  emptyLabel = "Sin partidos.",
  onOpenMatch,
  onOpenPair,
}: RoundMatchesTableProps) {
  return (
    <table className="w-full table-fixed border-collapse text-[10px]">
      <colgroup>
        <col className={CANCHA_COL} />
        <col className="w-[5.5rem]" />
        <col className={PARTIDOS_COL} />
        <col className="min-w-0" />
      </colgroup>
      <thead>
        {title ? (
          <tr className="border-b border-foreground/20 bg-card text-foreground">
            <th
              colSpan={COL_COUNT}
              className="px-1.5 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide"
            >
              {title}
            </th>
          </tr>
        ) : null}
        <tr className="bg-emerald-100 text-emerald-950">
          <th className="px-1.5 py-2 text-left font-bold uppercase tracking-wide whitespace-nowrap">
            Cancha
          </th>
          <th className="px-1.5 py-2 text-left font-bold uppercase tracking-wide whitespace-nowrap">
            Estado
          </th>
          <th className="px-1.5 py-2 text-left font-bold uppercase tracking-wide">
            Partidos
          </th>
          <th className="px-1.5 py-2 text-center font-bold uppercase tracking-wide whitespace-nowrap">
            Resultado
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={COL_COUNT} className="px-2 py-3 text-muted-foreground">
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
              <td className="px-1.5 py-1 align-middle text-muted-foreground">
                <div className="min-w-0 leading-tight">
                  <p className="truncate font-bold">{row.schedule}</p>
                  <p className="truncate font-bold">{row.court}</p>
                </div>
              </td>
              <td className="px-1.5 py-1 align-middle">
                <MatchPlayStatusChip
                  status={row.playStatus}
                  hint={row.statusHint}
                  className="h-4 px-1.5 text-[10px]"
                />
              </td>
              <td className="px-1.5 py-1 align-middle">
                <div className="flex min-w-0 items-center gap-1.5">
                  <PairVsBlock
                    className="min-w-0 text-[10px]"
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
                </div>
              </td>
              <td className="min-w-0 px-1.5 py-1 align-middle text-center">
                <div className="inline-flex justify-center">
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
