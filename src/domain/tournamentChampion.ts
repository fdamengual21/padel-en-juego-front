import type { GroupStanding, Match, TournamentGroup } from "./types";

/**
 * Pareja campeona de la categoría: ganadora de la final, o 1° de la zona única si no hay llave.
 */
export function resolveTournamentChampionPairId(input: {
  elimMatches: Pick<Match, "phase" | "winnerPairId">[];
  groups?: Pick<TournamentGroup, "id" | "qualifies">[];
  standings?: Pick<GroupStanding, "groupId" | "pairId" | "position">[];
  finishedGroupIds?: string[];
}): string | null {
  const final = input.elimMatches.find((match) => match.phase === "FINAL");
  if (final) return final.winnerPairId ?? null;

  const zone = (input.groups ?? []).find((group) => group.qualifies === 0);
  if (!zone) return null;
  if (input.finishedGroupIds && !input.finishedGroupIds.includes(zone.id)) return null;
  return (
    (input.standings ?? []).find(
      (row) => row.groupId === zone.id && row.position === 1,
    )?.pairId ?? null
  );
}

export function championPairNames(
  pairId: string,
  pairPlayerNames: Record<string, [string, string]>,
  pairLabels: Record<string, string>,
): [string, string] {
  const named = pairPlayerNames[pairId];
  if (named?.[0]) return named;
  const label = pairLabels[pairId];
  if (!label) return ["Pareja", ""];
  const parts = label.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  return [label, ""];
}
