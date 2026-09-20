import type { MatchRules, SetScore } from "./types";

/** Cantidad máxima de columnas en el marcador (sets + tie-break decisivo si aplica). */
export function scoreboardSlotCount(rules: MatchRules): number {
  return Math.max(1, rules.setsToWin * 2 - 1);
}

/**
 * El marcador decisivo empatado (ej. 1-1 a sets) se juega a tie-break / super tie-break,
 * no como un set normal a 6 juegos.
 */
export function isDecidingTiebreakMoment(
  winsA: number,
  winsB: number,
  rules: MatchRules,
): boolean {
  return (
    rules.superTiebreakEnabled &&
    rules.setsToWin >= 2 &&
    winsA === rules.setsToWin - 1 &&
    winsB === rules.setsToWin - 1
  );
}

export function scoreboardSlotLabel(
  slotIndex: number,
  rules: MatchRules,
  winsBefore?: { a: number; b: number },
): string {
  if (
    winsBefore &&
    isDecidingTiebreakMoment(winsBefore.a, winsBefore.b, rules)
  ) {
    return "Tie-break";
  }
  if (
    rules.superTiebreakEnabled &&
    rules.setsToWin >= 2 &&
    slotIndex === scoreboardSlotCount(rules) - 1
  ) {
    return "Tie-break";
  }
  return `Set ${slotIndex + 1}`;
}

export function setWinnerSide(set: SetScore): "A" | "B" | null {
  if (set.gamesA === set.gamesB) {
    if (set.tiebreakA == null || set.tiebreakB == null) return null;
    if (set.tiebreakA === set.tiebreakB) return null;
    return set.tiebreakA > set.tiebreakB ? "A" : "B";
  }
  return set.gamesA > set.gamesB ? "A" : "B";
}

function isValidTiebreakPoints(
  pointsA: number,
  pointsB: number,
  target: number,
  winByTwo: boolean,
): boolean {
  if (!Number.isFinite(pointsA) || !Number.isFinite(pointsB)) return false;
  if (pointsA < 0 || pointsB < 0) return false;
  if (pointsA === pointsB) return false;
  const hi = Math.max(pointsA, pointsB);
  const lo = Math.min(pointsA, pointsB);
  if (hi < target) return false;
  if (hi === target) {
    return winByTwo ? hi - lo >= 2 : hi > lo;
  }
  return winByTwo ? hi - lo === 2 : hi > lo;
}

/** Set a juegos (6-4, 7-5, 7-6…). */
export function isValidRegularSet(set: SetScore, rules: MatchRules): boolean {
  const target = Math.max(1, rules.gamesPerSet);
  const a = set.gamesA;
  const b = set.gamesB;
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) return false;
  if (a === b) return false;

  const hi = Math.max(a, b);
  const lo = Math.min(a, b);

  if (hi === target && lo <= target - 2) return true;
  if (hi === target + 1 && lo === target - 1) return true;
  if (hi === target + 1 && lo === target) {
    if (!rules.tiebreakEnabled) return true;
    if (set.tiebreakA != null && set.tiebreakB != null) {
      return isValidTiebreakPoints(
        set.tiebreakA,
        set.tiebreakB,
        rules.tiebreakPoints,
        rules.tiebreakWinByTwo,
      );
    }
    return true;
  }
  return false;
}

/** Columna decisiva: puntos de tie-break (ej. a 10). */
export function isValidDecidingTiebreak(set: SetScore, rules: MatchRules): boolean {
  return isValidTiebreakPoints(
    set.gamesA,
    set.gamesB,
    rules.superTiebreakPoints,
    rules.superTiebreakWinByTwo,
  );
}

export type MatchResultValidation =
  | { ok: true; winnerSide: "A" | "B" }
  | { ok: false; message: string };

/**
 * Valida el marcador contra las reglas del torneo.
 * Con mejor de 3 + tie-break: no se admite un 3.er set a juegos; la 3.ª columna es el TB.
 */
export function validateMatchResultSets(
  sets: SetScore[],
  rules: MatchRules,
): MatchResultValidation {
  if (!sets.length) {
    return { ok: false, message: "Cargá al menos un set con marcador." };
  }

  const maxSlots = scoreboardSlotCount(rules);
  if (sets.length > maxSlots) {
    return {
      ok: false,
      message: `Este formato admite como máximo ${maxSlots} columnas de resultado.`,
    };
  }

  let winsA = 0;
  let winsB = 0;

  for (let i = 0; i < sets.length; i += 1) {
    if (winsA >= rules.setsToWin || winsB >= rules.setsToWin) {
      return {
        ok: false,
        message: "Hay marcadores de más: el partido ya tenía ganador.",
      };
    }

    const set = sets[i]!;
    const deciding = isDecidingTiebreakMoment(winsA, winsB, rules);

    if (deciding) {
      if (!isValidDecidingTiebreak(set, rules)) {
        return {
          ok: false,
          message: `El tie-break decisivo es a ${rules.superTiebreakPoints} puntos${
            rules.superTiebreakWinByTwo ? " con diferencia de 2" : ""
          }.`,
        };
      }
    } else {
      if (
        rules.superTiebreakEnabled &&
        rules.setsToWin >= 2 &&
        i >= rules.setsToWin &&
        !(winsA === rules.setsToWin - 1 && winsB === rules.setsToWin - 1)
      ) {
        return {
          ok: false,
          message:
            "Con este formato no se juega un tercer set a juegos: la última columna es tie-break.",
        };
      }
      if (!isValidRegularSet(set, rules)) {
        return {
          ok: false,
          message: `Set ${i + 1} inválido. Usá marcadores como 6-4, 7-5 o 7-6.`,
        };
      }
    }

    const side = setWinnerSide(set);
    if (!side) {
      return { ok: false, message: `La columna ${i + 1} no define un ganador.` };
    }
    if (side === "A") winsA += 1;
    else winsB += 1;
  }

  if (winsA < rules.setsToWin && winsB < rules.setsToWin) {
    return {
      ok: false,
      message: `Una pareja debe ganar ${rules.setsToWin} set${rules.setsToWin === 1 ? "" : "s"}.`,
    };
  }

  return { ok: true, winnerSide: winsA > winsB ? "A" : "B" };
}

export function isMatchResultComplete(
  match: {
    sets: SetScore[];
    winnerPairId: string | null;
    pairAId: string | null;
    pairBId: string | null;
  },
  rules: MatchRules,
): boolean {
  if (!match.pairAId || !match.pairBId || !match.winnerPairId || !match.sets.length) {
    return false;
  }
  const validation = validateMatchResultSets(match.sets, rules);
  if (!validation.ok) return false;
  const expected =
    validation.winnerSide === "A" ? match.pairAId : match.pairBId;
  return match.winnerPairId === expected;
}

export function deriveWinnerPairIdFromSets(
  sets: SetScore[],
  pairAId: string,
  pairBId: string,
  rules: MatchRules,
): string | null {
  const validation = validateMatchResultSets(sets, rules);
  if (!validation.ok) return null;
  return validation.winnerSide === "A" ? pairAId : pairBId;
}
