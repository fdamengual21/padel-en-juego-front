import type { CuadroBoardView, Match } from "@/domain";
import BracketView from "@/components/tournaments/BracketView";
import { Button } from "@/components/ui/button";
import { roundSectionLabel } from "@/lib/tournamentLabels";

interface CuadroBoardProps {
  board: CuadroBoardView;
  isLoading?: boolean;
  onOpenResult: (match: Match) => void;
  onSyncStructure?: () => void;
  syncPending?: boolean;
  /** Vista jugador/guest: copy sin “cargar resultado”. */
  readOnly?: boolean;
}

export default function CuadroBoard({
  board,
  isLoading = false,
  onOpenResult,
  onSyncStructure,
  syncPending = false,
  readOnly = false,
}: CuadroBoardProps) {
  const sortedRounds = [...board.rounds].sort((a, b) => a.order - b.order);
  const sectionTrail = [
    "Zonas",
    ...sortedRounds.map((r) => roundSectionLabel(r.type, r.name)),
  ].join(" → ");

  return (
    <div className="space-y-3" data-testid="cuadro-board">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Cuadro del torneo</p>
          <p className="text-sm text-muted-foreground">
            {sectionTrail}
            {readOnly
              ? ". Consultá horarios, estado y resultados."
              : ". Misma tabla que Zonas: tocá una fila para cargar el resultado. 1° a cuartos; 2° a octavos."}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Actualizado{" "}
            {new Date(board.generatedAt).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
            {isLoading ? " · actualizando…" : ""}
          </p>
        </div>
        {onSyncStructure ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={syncPending}
            onClick={onSyncStructure}
          >
            {syncPending ? "Sincronizando…" : "Sincronizar estructura"}
          </Button>
        ) : null}
      </div>

      {board.notice ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          data-testid="cuadro-notice"
        >
          {board.notice}
        </div>
      ) : null}

      {board.unassignedPairs.length > 0 ? (
        <div className="rounded-xl border border-border bg-card px-3 py-2">
          <p className="text-xs font-medium text-foreground">
            Parejas fuera del cuadro
          </p>
          <ul className="mt-1 space-y-1">
            {board.unassignedPairs.map((p) => (
              <li key={p.pairId} className="text-sm text-muted-foreground">
                {p.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <BracketView
        groups={board.groups}
        groupMatches={board.groupMatches}
        rounds={sortedRounds}
        matches={board.elimMatches}
        slots={board.slots}
        pairLabels={board.pairLabels}
        pairPlayerNames={board.pairPlayerNames}
        matchRules={board.matchRules}
        onMatchClick={readOnly ? undefined : onOpenResult}
        heightClassName="h-[720px]"
      />
    </div>
  );
}
