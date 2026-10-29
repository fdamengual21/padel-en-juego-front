import { useState } from "react";
import type { CuadroBoardView, Match, MatchPhase } from "@/domain";
import {
  knockoutRebuildBlockedReason,
  matchMoveBlockedReason,
  matchPairingBlockedReason,
  qualifyChangeBlockedReason,
} from "@/domain";
import BracketView, { displayZoneName } from "@/components/tournaments/BracketView";
import { roundSectionLabel } from "@/lib/tournamentLabels";
import MatchPairingModal from "./MatchPairingModal";
import MovePairPhaseModal from "./MovePairPhaseModal";
import QualifyPairModal from "./QualifyPairModal";

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
  onMovePair,
  moveSaving = false,
  onQualifyPair,
  qualifySaving = false,
}: CuadroBoardProps) {
  const [pairingMatchId, setPairingMatchId] = useState<string | null>(null);
  const [movingMatchId, setMovingMatchId] = useState<string | null>(null);
  const [qualifyingMatchId, setQualifyingMatchId] = useState<string | null>(null);
  const sortedRounds = [...board.rounds].sort((a, b) => a.order - b.order);
  const sectionTrail = [
    ...(board.groups.length ? ["Zonas"] : []),
    ...sortedRounds.map((r) => roundSectionLabel(r.type, r.name)),
  ].join(" → ");
  const canEditPairing = Boolean(onSetPairing) && !readOnly && !tournamentLocked;
  const canMovePairs =
    Boolean(onMovePair) && !readOnly && !tournamentLocked && tournamentStarted;
  const knockoutPhases = sortedRounds
    .map((round) => round.type)
    .filter((phase): phase is MatchPhase => phase !== "GROUP");
  const pairingMatch = findBoardMatch(board, pairingMatchId);
  const movingMatch = findBoardMatch(board, movingMatchId);
  const movingPairs = [movingMatch?.pairAId, movingMatch?.pairBId]
    .filter((id): id is string => Boolean(id))
    .map((pairId) => ({ pairId, names: pairMoveNames(pairId, board) }));
  const qualifyingMatch =
    qualifyingMatchId != null
      ? (board.elimMatches.find((m) => m.id === qualifyingMatchId) ?? null)
      : null;
  const qualifyingPairs = [qualifyingMatch?.pairAId, qualifyingMatch?.pairBId]
    .filter((id): id is string => Boolean(id))
    .map((pairId) => ({ pairId, names: pairMoveNames(pairId, board) }));
  const pairingLockedReason = pairingMatch
    ? qualifyChangeBlockedReason(pairingMatch, board.elimMatches, board.slots)
    : null;
  const qualifyingLockedReason = qualifyingMatch
    ? qualifyChangeBlockedReason(qualifyingMatch, board.elimMatches, board.slots)
    : null;
  const qualifyingRound = qualifyingMatch
    ? (board.rounds.find((r) => r.id === qualifyingMatch.roundId) ?? null)
    : null;
  const nextQualifyIndex =
    qualifyingMatch != null ? knockoutPhases.indexOf(qualifyingMatch.phase) : -1;
  const nextQualifyPhase =
    nextQualifyIndex >= 0 ? knockoutPhases[nextQualifyIndex + 1] : undefined;
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
        onMovePair={canMovePairs ? (match) => setMovingMatchId(match.id) : undefined}
        moveBlockedReason={(match) =>
          matchMoveBlockedReason(
            match,
            board.slots,
            tournamentStarted,
            board.knockoutStructure?.rebuildBlockedReason ??
              knockoutRebuildBlockedReason(board.elimMatches, board.slots),
            board.groupMatches,
          )
        }
        heightClassName="h-[720px]"
      />

      {onSetPairing ? (
        <MatchPairingModal
          open={Boolean(pairingMatch)}
          match={pairingMatch}
          roundLabel={
            pairingMatch?.phase === "GROUP" && pairingMatch.groupId
              ? displayZoneName(
                  board.groups.find((group) => group.id === pairingMatch.groupId)?.name ?? "Zona",
                )
              : pairingRound
                ? roundSectionLabel(pairingRound.type, pairingRound.name)
                : "Ronda"
          }
          roundMatches={
            pairingMatch?.phase === "GROUP" && pairingMatch.groupId
              ? board.groupMatches.filter((item) => item.groupId === pairingMatch.groupId)
              : pairingMatch
                ? board.elimMatches.filter((item) => item.roundId === pairingMatch.roundId)
                : []
          }
          candidateIds={
            pairingMatch?.phase === "GROUP" && pairingMatch.groupId
              ? (board.groups.find((group) => group.id === pairingMatch.groupId)?.pairIds ?? [])
              : (board.pairingCandidates ?? [])
          }
          pairLabels={board.pairLabels}
          isSubmitting={pairingMatch != null && pairingSavingMatchId === pairingMatch.id}
          lockedReason={pairingLockedReason}
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
            qualifyingRound
              ? roundSectionLabel(qualifyingRound.type, qualifyingRound.name)
              : "esta ronda"
          }
          nextRoundLabel={nextQualifyPhase ? roundSectionLabel(nextQualifyPhase) : null}
          pairs={qualifyingPairs}
          isSubmitting={qualifySaving}
          lockedReason={qualifyingLockedReason}
          alreadyClassified={qualifyingMatch?.status === "walkover"}
          initialPairId={qualifyingMatch?.winnerPairId ?? qualifyingMatch?.pairAId ?? qualifyingMatch?.pairBId}
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
          phases={knockoutPhases}
          groups={board.groups.map((group) => ({
            id: group.id,
            name: displayZoneName(group.name),
            pairCount: group.pairIds.length,
          }))}
          currentGroupId={movingMatch?.groupId ?? null}
          pairGroupIds={Object.fromEntries(
            board.groups.flatMap((group) => group.pairIds.map((pairId) => [pairId, group.id])),
          )}
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
    </div>
  );
}

function findBoardMatch(board: CuadroBoardView, matchId: string | null): Match | null {
  if (!matchId) return null;
  return (
    board.elimMatches.find((match) => match.id === matchId) ??
    board.groupMatches.find((match) => match.id === matchId) ??
    null
  );
}

function pairMoveNames(pairId: string, board: CuadroBoardView): [string, string] {
  const named = board.pairPlayerNames[pairId];
  if (named?.[0]) return named;
  const label = board.pairLabels[pairId];
  if (!label) return ["Pareja", ""];
  const parts = label.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  return [label, ""];
}
