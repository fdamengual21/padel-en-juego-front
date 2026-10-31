import type { PairStatus, RegistrationStatus } from "./types";

/** Inscripción aceptada candidata a pasar a suplente al bajar el cupo. */
export interface AcceptedOverflowCandidate {
  pairId: string;
  player2Id: string | null;
  pairStatus: PairStatus;
  registrationId: string;
  registrationStatus: RegistrationStatus;
  registeredAt: string;
  statusChangedAt: string | null;
}

function spots(pairs: Array<{ player2Id: string | null }>) {
  let complete = 0;
  let solo = 0;
  for (const pair of pairs) {
    if (pair.player2Id) complete += 1;
    else solo += 1;
  }
  return complete + Math.ceil(solo / 2);
}

function changedAt(item: AcceptedOverflowCandidate) {
  return Date.parse(item.statusChangedAt ?? item.registeredAt);
}

/**
 * Últimas aceptadas que pasarían a suplente si el máximo baja a `nextMaxPairs`.
 * Misma regla que la API: completas primero, las más recientes primero.
 */
export function acceptedOverflowSubstitutes(
  items: AcceptedOverflowCandidate[],
  nextMaxPairs: number,
): AcceptedOverflowCandidate[] {
  const accepted = items.filter(
    (item) => item.registrationStatus === "ACCEPTED" && item.pairStatus === "active",
  );
  const ordered = [...accepted].sort((left, right) => {
    const leftSolo = left.player2Id == null ? 1 : 0;
    const rightSolo = right.player2Id == null ? 1 : 0;
    if (leftSolo !== rightSolo) return leftSolo - rightSolo;
    const byDate = changedAt(right) - changedAt(left);
    if (byDate !== 0) return byDate;
    return right.registrationId.localeCompare(left.registrationId);
  });

  const remaining = [...accepted];
  const demoted: AcceptedOverflowCandidate[] = [];
  for (const item of ordered) {
    if (spots(remaining) <= nextMaxPairs) break;
    const index = remaining.findIndex((row) => row.registrationId === item.registrationId);
    if (index < 0) continue;
    remaining.splice(index, 1);
    demoted.push(item);
  }
  return demoted;
}
