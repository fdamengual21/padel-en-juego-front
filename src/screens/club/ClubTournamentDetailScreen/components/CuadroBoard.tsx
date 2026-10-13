import { useState } from "react";
import type { CuadroBoardView, Match } from "@/domain";
import { matchPairingBlockedReason } from "@/domain";
import BracketView, { displayZoneName } from "@/components/tournaments/BracketView";
import { roundSectionLabel } from "@/lib/tournamentLabels";
import MatchPairingModal from "./MatchPairingModal";

interface CuadroBoardProps {
  board: CuadroBoardView;
  isLoading?: boolean;
  onOpenResult: (match: Match) => void;
  onOpenPair?: (pairId: string) => void;
  /** Vista jugador/guest: copy sin “cargar resultado”. */
  readOnly?: boolean;
  /** Cuadro armado (torneo comenzado): habilita cruces manuales. */
  tournamentStarted?: boolean;
  /** Torneo finalizado/cancelado. */
  tournamentLocked?: boolean;
  onSetPairing?: (input: {
    matchId: string;
    pairAId: string;
    pairBId: string;
    note: string | null;
  }) => Promise<void> | void;
  pairingSavingMatchId?: string | null;
}

export default function CuadroBoard({
  board,
  isLoading = false,
  onOpenResult,
  onOpenPair,
  readOnly = false,
  tournamentStarted = false,
  tournamentLocked = false,
  onSetPairing,
  pairingSavingMatchId = null,
}: CuadroBoardProps) {
  const [pairingMatchId, setPairingMatchId] = useState<string | null>(null);
  const sortedRounds = [...board.rounds].sort((a, b) => a.order - b.order);
  const sectionTrail = [
    ...(board.groups.length ? ["Zonas"] : []),
    ...sortedRounds.map((r) => roundSectionLabel(r.type, r.name)),
  ].join(" → ");
  const canEditPairing = Boolean(onSetPairing) && !readOnly && !tournamentLocked;
  const pairingMatch =
    pairingMatchId != null
      ? (board.elimMatches.find((m) => m.id === pairingMatchId) ?? null)
      : null;
  const pairingRound = pairingMatch
    ? (board.rounds.find((r) => r.id === pairingMatch.roundId) ?? null)
    : null;
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
              : ". Tocá una fila para cargar el resultado. Los primeros de zona entran cruzados al cuadro."}
            {canEditPairing
              ? " Con el lápiz podés fijar a mano un cruce todavía no jugado, solo entre parejas aceptadas dentro del cuadro."
              : ""}
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
        pairPlayerNames={board.pairPlayerNames}
        matchRules={board.matchRules}
        onMatchClick={onOpenResult}
        canEditResult={!readOnly && !tournamentLocked}
        onOpenPair={onOpenPair}
        onEditPairing={canEditPairing ? (match) => setPairingMatchId(match.id) : undefined}
        pairingBlockedReason={(match) =>
          matchPairingBlockedReason(match, board.slots, tournamentStarted)
        }
        heightClassName="h-[720px]"
      />

      {onSetPairing ? (
        <MatchPairingModal
          open={Boolean(pairingMatch)}
          match={pairingMatch}
          roundLabel={
            pairingRound ? roundSectionLabel(pairingRound.type, pairingRound.name) : "Ronda"
          }
          roundMatches={
            pairingMatch
              ? board.elimMatches.filter((m) => m.roundId === pairingMatch.roundId)
              : []
          }
          candidateIds={board.pairingCandidates}
          pairLabels={board.pairLabels}
          isSubmitting={pairingMatch != null && pairingSavingMatchId === pairingMatch.id}
          onOpenChange={(open) => {
            if (!open) setPairingMatchId(null);
          }}
          onSubmit={async ({ pairAId, pairBId, note }) => {
            if (!pairingMatch) return;
            await onSetPairing({ matchId: pairingMatch.id, pairAId, pairBId, note });
            setPairingMatchId(null);
          }}
        />
      ) : null}
    </div>
  );
}
