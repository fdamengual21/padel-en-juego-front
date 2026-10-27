import type { CuadroBoardView } from "@/domain";
import type { PublicCuadroBoard } from "@/modules/tournament-ops/types";

/** Cuadro público + campo de club vacío, para el board compartido en solo lectura. */
export function toCuadroBoardView(board: PublicCuadroBoard): CuadroBoardView {
  return {
    ...board,
    pairingCandidates: [],
  };
}
