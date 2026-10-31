import type { CuadroBoardView, Match } from "@/domain";
import BracketView, { displayZoneName } from "@/components/tournaments/BracketView";
import { roundSectionLabel } from "@/lib/tournamentLabels";

interface CuadroBoardProps {
  board: CuadroBoardView;
  isLoading?: boolean;
  onOpenResult: (match: Match) => void;
  onOpenPair?: (pairId: string) => void;
  /** Vista jugador/guest: copy sin “cargar resultado”. */
  readOnly?: boolean;
  /** Torneo finalizado/cancelado. */
  tournamentLocked?: boolean;
}

export default function CuadroBoard({
  board,
  isLoading = false,
  onOpenResult,
  onOpenPair,
  readOnly = false,
  tournamentLocked = false,
}: CuadroBoardProps) {
  const sortedRounds = [...board.rounds].sort((a, b) => a.order - b.order);
  const sectionTrail = [
    ...(board.groups.length ? ["Zonas"] : []),
    ...sortedRounds.map((r) => roundSectionLabel(r.type, r.name)),
  ].join(" → ");
  const unresolvedZones = board.unresolvedTies
    .map((tie) => board.groups.find((g) => g.id === tie.groupId))
    .filter((group): group is NonNullable<typeof group> => group != null)
    .map((group) => displayZoneName(group.name));

  return (
    <div className="space-y-3" data-testid="cuadro-board">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Cuadro del torneo</p>
          <p className="text-sm text-muted-foreground">
            {sectionTrail}
            {readOnly || tournamentLocked
              ? ". Consultá horarios, estado y resultados. Tocá un marcador cargado para verlo."
              : ". Tocá una fila para cargar el resultado. Los primeros de zona entran cruzados al cuadro. Cruce, En vivo y mover pareja se gestionan desde Zonas."}
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
      </div>

      {board.notice ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          data-testid="cuadro-notice"
        >
          {board.notice}
        </div>
      ) : null}

      {unresolvedZones.length ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          data-testid="cuadro-unresolved-ties"
        >
          {unresolvedZones.length === 1
            ? `${unresolvedZones[0]} tiene un empate que el reglamento no resuelve. Hasta que el club lo sortee desde la pestaña Zonas, esos lugares del cuadro quedan por definir.`
            : `${unresolvedZones.join(", ")} tienen empates que el reglamento no resuelve. Hasta que el club los sortee desde la pestaña Zonas, esos lugares del cuadro quedan por definir.`}
        </div>
      ) : null}

      <BracketView
        groups={board.groups}
        groupMatches={board.groupMatches}
        rounds={sortedRounds}
        matches={board.elimMatches}
        slots={board.slots}
        pairLabels={board.pairLabels}
        matchRules={board.matchRules}
        courts={board.courts ?? []}
        onMatchClick={onOpenResult}
        canEditResult={!readOnly && !tournamentLocked}
        onOpenPair={onOpenPair}
        heightClassName="h-[720px]"
      />
    </div>
  );
}
