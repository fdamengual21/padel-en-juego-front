import type { Match } from "@core-api";
import MatchPlayStatusChip from "@/components/tournaments/MatchPlayStatusChip";
import MatchScoreBoxes from "@/components/tournaments/MatchScoreBoxes";
import PairVsBlock from "@/components/tournaments/PairVsBlock";
import type { MatchPlayStatus } from "@/lib/matchPlayStatus";
import { cn } from "@/lib/utils";

export interface MatchTableRow {
  n: number;
  vs: string;
  schedule: string;
  matchId: string;
  pairALabel: string;
  pairBLabel: string;
  sets: Match["sets"];
  playStatus: MatchPlayStatus;
  canEdit: boolean;
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
}

export default function RoundMatchesTable({
  title,
  rows,
  slotCount,
  decidingSlotIndex,
  showIndexColumn = true,
  emptyLabel = "Sin partidos.",
  onOpenMatch,
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
                row.canEdit && "cursor-pointer hover:bg-muted/50",
              )}
              onClick={() => {
                if (!row.canEdit || !onOpenMatch) return;
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
                    slotCount={slotCount}
                    decidingSlotIndex={decidingSlotIndex}
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
