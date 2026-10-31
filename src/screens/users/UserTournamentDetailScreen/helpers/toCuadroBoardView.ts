import type { CuadroBoardView } from "@/domain";
import type { PublicCuadroBoard, PublicRepechageBoard } from "@/modules/tournament-ops/types";

/** Cuadro público + campo de club vacío, para el board compartido en solo lectura. */
export function toCuadroBoardView(
  board: PublicCuadroBoard | PublicRepechageBoard,
): CuadroBoardView {
  return {
    categoryId: board.categoryId,
    generatedAt: board.generatedAt,
    groups: board.groups,
    groupMatches: board.groupMatches,
    rounds: board.rounds,
    elimMatches: board.elimMatches,
    slots: board.slots,
    pairLabels: board.pairLabels,
    pairPlayerNames: board.pairPlayerNames,
    matchRules: board.matchRules,
    courts: board.courts ?? [],
    unresolvedTies: board.unresolvedTies,
    pairingCandidates: [],
    notice: board.notice,
  };
}
