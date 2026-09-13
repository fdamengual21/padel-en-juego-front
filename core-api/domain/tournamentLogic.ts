import type {
  GenerateGroupsConfig,
  GroupConfigValidation,
  GroupStanding,
  Match,
  MatchResultInput,
  MatchSlot,
  SetScore,
  TieBreaker,
  TournamentGroup,
  TournamentPair,
  TournamentRound,
} from "../types";

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function delay(ms = 40): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function resolveGroupConfig(
  pairCount: number,
  options?: { pairsPerGroup?: number | null; qualifyPerGroup?: number | null },
): GenerateGroupsConfig | null {
  if (pairCount < 2) return null;
  const pairsPerGroup = Math.max(2, options?.pairsPerGroup ?? 4);
  const groupCount = Math.max(1, Math.ceil(pairCount / pairsPerGroup));
  const qualifyPerGroup = Math.min(
    Math.max(1, options?.qualifyPerGroup ?? 2),
    pairsPerGroup,
  );
  return { groupCount, pairsPerGroup, qualifyPerGroup };
}

/** Compat: deriva zonas desde parejas/zona (última zona puede quedar con menos). */
export function suggestGroupConfig(pairCount: number): GenerateGroupsConfig | null {
  return resolveGroupConfig(pairCount, { pairsPerGroup: 4, qualifyPerGroup: 2 });
}

export function validateGroupConfig(
  pairCount: number,
  config: GenerateGroupsConfig,
): GroupConfigValidation {
  if (pairCount < 2) {
    return {
      ok: false,
      qualifiedCount: 0,
      message: "Hacen falta al menos 2 parejas para armar zonas.",
      needsComplementaryRule: false,
    };
  }
  if (config.pairsPerGroup < 2) {
    return {
      ok: false,
      qualifiedCount: 0,
      message: "Cada zona debe tener al menos 2 parejas como tamaño objetivo.",
      needsComplementaryRule: false,
    };
  }
  const derivedGroups = Math.ceil(pairCount / config.pairsPerGroup);
  const groupCount = Math.max(config.groupCount, derivedGroups);
  const capacity = groupCount * config.pairsPerGroup;
  if (capacity < pairCount) {
    return {
      ok: false,
      qualifiedCount: groupCount * config.qualifyPerGroup,
      message: `La capacidad (${capacity}) no alcanza para ${pairCount} parejas.`,
      needsComplementaryRule: false,
    };
  }
  const qualifiedCount = groupCount * config.qualifyPerGroup;
  const powerOfTwo = qualifiedCount > 0 && (qualifiedCount & (qualifiedCount - 1)) === 0;
  const remainder = pairCount % config.pairsPerGroup;
  return {
    ok: true,
    qualifiedCount,
    message: [
      remainder !== 0
        ? `La última zona queda con ${remainder} pareja(s); el resto se llena a ${config.pairsPerGroup}.`
        : null,
      powerOfTwo
        ? null
        : `Esta configuración genera ${qualifiedCount} clasificados. Para una llave limpia hace falta regla complementaria (mejores terceros, play-in o BYE).`,
    ]
      .filter(Boolean)
      .join(" ") || null,
    needsComplementaryRule: !powerOfTwo,
  };
}

export function generateGroups(
  categoryId: string,
  pairs: TournamentPair[],
  config: GenerateGroupsConfig,
  /** pairId → orden de zona (1-based) para anclar tras partidos jugados. */
  zoneAnchors?: Record<string, number>,
): TournamentGroup[] {
  const active = pairs.filter((p) => p.status === "active");
  const pairsPerGroup = Math.max(1, config.pairsPerGroup);
  const derivedGroups = Math.max(1, Math.ceil(active.length / pairsPerGroup));
  const groupCount = Math.max(config.groupCount, derivedGroups);
  const buckets: string[][] = Array.from({ length: groupCount }, () => []);
  const placed = new Set<string>();

  if (zoneAnchors) {
    for (const pair of active) {
      const order = zoneAnchors[pair.id];
      if (order == null || order < 1 || order > groupCount) continue;
      const bucket = buckets[order - 1]!;
      if (bucket.length >= pairsPerGroup) continue;
      bucket.push(pair.id);
      placed.add(pair.id);
    }
  }

  const remaining = active
    .filter((p) => !placed.has(p.id))
    .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));

  // Llenado secuencial: cada zona hasta pairsPerGroup; el remanente queda en la última
  // (puede ser 1 pareja sola). No se reparte en partes iguales.
  for (const pair of remaining) {
    let target = -1;
    for (let i = 0; i < buckets.length; i += 1) {
      if (buckets[i]!.length < pairsPerGroup) {
        target = i;
        break;
      }
    }
    if (target < 0) target = buckets.length - 1;
    if (target < 0) break;
    buckets[target]!.push(pair.id);
  }

  return buckets
    .filter((pairIds) => pairIds.length > 0)
    .map((pairIds, g) => ({
      id: createId("group"),
      tournamentCategoryId: categoryId,
      name: `Zona ${String.fromCharCode(65 + g)}`,
      order: g + 1,
      pairIds,
    }));
}

/**
 * True si las zonas respetan el cupo: las no finales llenas a pairsPerGroup
 * y ninguna supera ese tamaño (reparto 4+4+1, no 3+3+3).
 */
export function groupsRespectPairsPerGroup(
  groups: Array<{ order: number; pairIds: string[] }>,
  pairsPerGroup: number,
): boolean {
  if (groups.length === 0) return true;
  const cap = Math.max(1, pairsPerGroup);
  const sorted = [...groups].sort((a, b) => a.order - b.order);
  for (const g of sorted) {
    if (g.pairIds.length > cap) return false;
  }
  for (let i = 0; i < sorted.length - 1; i += 1) {
    if (sorted[i]!.pairIds.length < cap) return false;
  }
  return true;
}

export function matchPairingKey(pairAId: string, pairBId: string): string {
  return pairAId < pairBId ? `${pairAId}::${pairBId}` : `${pairBId}::${pairAId}`;
}

function buildPlayedClusters(
  pairIds: string[],
  playedMatches: Array<{ pairAId: string | null; pairBId: string | null }>,
): string[][] {
  const active = new Set(pairIds);
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p !== x) {
      const root = find(p);
      parent.set(x, root);
      return root;
    }
    return x;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const id of pairIds) parent.set(id, id);
  for (const m of playedMatches) {
    if (!m.pairAId || !m.pairBId) continue;
    if (!active.has(m.pairAId) || !active.has(m.pairBId)) continue;
    union(m.pairAId, m.pairBId);
  }
  const clusters = new Map<string, string[]>();
  for (const id of pairIds) {
    const root = find(id);
    const list = clusters.get(root) ?? [];
    list.push(id);
    clusters.set(root, list);
  }
  return [...clusters.values()];
}

/**
 * Arma zonas llenando al cupo (4+4+1), sin partir clusters unidos por VS ya jugados.
 */
export function assignPairsToZonesPreservingPlayed(
  pairIds: string[],
  pairsPerGroup: number,
  playedMatches: Array<{ pairAId: string | null; pairBId: string | null }>,
  previousMembership: Array<{ order: number; pairIds: string[] }>,
): string[][] {
  if (pairIds.length === 0) return [];
  const cap = Math.max(1, pairsPerGroup);
  const prevOrder = new Map<string, number>();
  for (const g of previousMembership) {
    for (const id of g.pairIds) {
      if (!prevOrder.has(id)) prevOrder.set(id, g.order);
    }
  }

  const clusters = buildPlayedClusters(pairIds, playedMatches).map((members) => ({
    members,
    locked: members.length > 1,
    order: Math.min(...members.map((id) => prevOrder.get(id) ?? 999)),
  }));

  clusters.sort((a, b) => {
    if (a.locked !== b.locked) return a.locked ? -1 : 1;
    if (a.order !== b.order) return a.order - b.order;
    return b.members.length - a.members.length;
  });

  const groupCount = Math.max(1, Math.ceil(pairIds.length / cap));
  const buckets: string[][] = Array.from({ length: groupCount }, () => []);

  const placeCluster = (members: string[]) => {
    const size = members.length;
    // Prefer bucket matching previous order with room for the whole cluster.
    const preferred = Math.min(...members.map((id) => prevOrder.get(id) ?? 999));
    if (preferred !== 999 && preferred >= 1 && preferred <= buckets.length) {
      const idx = preferred - 1;
      if (buckets[idx]!.length + size <= cap || buckets[idx]!.length === 0) {
        buckets[idx]!.push(...members);
        return;
      }
    }
    for (let i = 0; i < buckets.length; i += 1) {
      if (buckets[i]!.length + size <= cap) {
        buckets[i]!.push(...members);
        return;
      }
    }
    // Cluster más grande que el cupo o sin lugar: zona propia / última.
    if (size > cap) {
      buckets.push([...members]);
      return;
    }
    let best = 0;
    for (let i = 1; i < buckets.length; i += 1) {
      if (buckets[i]!.length < buckets[best]!.length) best = i;
    }
    buckets[best]!.push(...members);
  };

  for (const cluster of clusters) {
    placeCluster(cluster.members);
  }

  return buckets.filter((b) => b.length > 0);
}

/**
 * Agrega parejas nuevas al final del llenado por cupo, sin mover el resto.
 */
export function appendPairsToZones(
  existing: Array<{ order: number; pairIds: string[] }>,
  newPairIds: string[],
  pairsPerGroup: number,
): string[][] {
  const cap = Math.max(1, pairsPerGroup);
  const buckets = [...existing]
    .sort((a, b) => a.order - b.order)
    .map((g) => [...g.pairIds]);
  if (buckets.length === 0) buckets.push([]);

  for (const pairId of newPairIds) {
    let target = buckets.findIndex((b) => b.length < cap);
    if (target < 0) {
      buckets.push([]);
      target = buckets.length - 1;
    }
    buckets[target]!.push(pairId);
  }
  return buckets.filter((b) => b.length > 0);
}

/** Circle method round-robin. Odd size gets a BYE (not a match). */
export function generateRoundRobinMatches(
  categoryId: string,
  group: TournamentGroup,
): Match[] {
  const ids = [...group.pairIds];
  if (ids.length < 2) return [];
  const bye = ids.length % 2 === 1;
  if (bye) ids.push("__BYE__");
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const rotation = [...ids];
  const matches: Match[] = [];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      if (a === "__BYE__" || b === "__BYE__") continue;
      matches.push({
        id: createId("match"),
        tournamentCategoryId: categoryId,
        phase: "GROUP",
        roundId: null,
        groupId: group.id,
        scheduledAt: null,
        courtId: null,
        status: "scheduled",
        winnerPairId: null,
        pairAId: a,
        pairBId: b,
        sets: [],
        scheduleManual: false,
      });
    }
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop()!);
    rotation.splice(0, rotation.length, fixed, ...rest);
  }
  return matches;
}

function setWinner(set: SetScore): "A" | "B" {
  if (set.gamesA === set.gamesB) {
    const tbA = set.tiebreakA ?? 0;
    const tbB = set.tiebreakB ?? 0;
    return tbA > tbB ? "A" : "B";
  }
  return set.gamesA > set.gamesB ? "A" : "B";
}

export function emptyStanding(groupId: string, pairId: string): GroupStanding {
  return {
    id: createId("standing"),
    groupId,
    pairId,
    played: 0,
    won: 0,
    lost: 0,
    points: 0,
    setsWon: 0,
    setsLost: 0,
    gamesWon: 0,
    gamesLost: 0,
    position: 0,
  };
}

export function computeStandings(
  group: TournamentGroup,
  matches: Match[],
  tieBreakers: TieBreaker[],
): GroupStanding[] {
  const map = new Map<string, GroupStanding>();
  for (const pairId of group.pairIds) {
    map.set(pairId, emptyStanding(group.id, pairId));
  }

  const finished = matches.filter(
    (m) =>
      m.groupId === group.id &&
      (m.status === "finished" || m.status === "walkover") &&
      m.pairAId &&
      m.pairBId,
  );

  for (const match of finished) {
    const a = map.get(match.pairAId!);
    const b = map.get(match.pairBId!);
    if (!a || !b) continue;
    a.played += 1;
    b.played += 1;
    let setsA = 0;
    let setsB = 0;
    for (const set of match.sets) {
      a.gamesWon += set.gamesA;
      a.gamesLost += set.gamesB;
      b.gamesWon += set.gamesB;
      b.gamesLost += set.gamesA;
      if (setWinner(set) === "A") setsA += 1;
      else setsB += 1;
    }
    a.setsWon += setsA;
    a.setsLost += setsB;
    b.setsWon += setsB;
    b.setsLost += setsA;
    if (match.winnerPairId === a.pairId) {
      a.won += 1;
      a.points += 2;
      b.lost += 1;
    } else if (match.winnerPairId === b.pairId) {
      b.won += 1;
      b.points += 2;
      a.lost += 1;
    }
  }

  const list = [...map.values()];
  list.sort((x, y) => compareStandings(x, y, list, finished, tieBreakers));
  list.forEach((row, index) => {
    row.position = index + 1;
  });
  return list;
}

function compareStandings(
  a: GroupStanding,
  b: GroupStanding,
  all: GroupStanding[],
  matches: Match[],
  tieBreakers: TieBreaker[],
): number {
  // Orden club: diferencia de sets (ganados − perdidos) primero.
  const primary: TieBreaker[] = [
    'SET_DIFFERENCE',
    ...tieBreakers.filter((k) => k !== 'SET_DIFFERENCE'),
  ];
  for (const key of primary) {
    let diff = 0;
    switch (key) {
      case 'POINTS':
        diff = b.points - a.points;
        break;
      case 'SET_DIFFERENCE':
        diff = b.setsWon - b.setsLost - (a.setsWon - a.setsLost);
        break;
      case 'GAME_DIFFERENCE':
        diff = b.gamesWon - b.gamesLost - (a.gamesWon - a.gamesLost);
        break;
      case 'GAMES_WON':
        diff = b.gamesWon - a.gamesWon;
        break;
      case 'HEAD_TO_HEAD': {
        const h2h = matches.find(
          (m) =>
            (m.pairAId === a.pairId && m.pairBId === b.pairId) ||
            (m.pairAId === b.pairId && m.pairBId === a.pairId),
        );
        if (h2h?.winnerPairId === a.pairId) diff = -1;
        else if (h2h?.winnerPairId === b.pairId) diff = 1;
        break;
      }
      default:
        diff = 0;
    }
    if (diff !== 0) return diff;
  }
  void all;
  return a.pairId.localeCompare(b.pairId);
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Shuffle determinista (misma categoría → mismo empareje). */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

type BracketEntrant = {
  pairId: string | null;
  groupId: string | null;
  position: number | null;
  sourceMatchId: string | null;
  sourceType: MatchSlot['sourceType'];
};

function emptyMatch(categoryId: string, round: TournamentRound): Match {
  return {
    id: createId('match'),
    tournamentCategoryId: categoryId,
    phase: round.type,
    roundId: round.id,
    groupId: null,
    scheduledAt: null,
    courtId: null,
    status: 'scheduled',
    winnerPairId: null,
    pairAId: null,
    pairBId: null,
    sets: [],
    scheduleManual: false,
  };
}

function applyEntrantToSlot(
  match: Match,
  side: 'A' | 'B',
  entrant: BracketEntrant | null,
): MatchSlot {
  const pairId = entrant?.pairId ?? null;
  if (side === 'A') match.pairAId = pairId;
  else match.pairBId = pairId;
  return {
    id: createId('slot'),
    matchId: match.id,
    side,
    sourceType: entrant?.sourceType ?? 'GROUP_POSITION',
    pairId,
    groupId: entrant?.groupId ?? null,
    groupPosition: entrant?.position ?? null,
    sourceMatchId: entrant?.sourceMatchId ?? null,
  };
}

/**
 * Bye solo si falta una pareja por padding del cuadro (no hay rival).
 * No es bye si el hueco espera el ganador de un partido anterior (MATCH_WINNER).
 */
function resolveBye(match: Match, slotA: MatchSlot, slotB: MatchSlot): void {
  const awaitingFeeder = (slot: MatchSlot, pairId: string | null) =>
    slot.sourceType === "MATCH_WINNER" && !pairId;

  if (awaitingFeeder(slotA, match.pairAId) || awaitingFeeder(slotB, match.pairBId)) {
    return;
  }

  if (match.pairAId && !match.pairBId) {
    match.winnerPairId = match.pairAId;
    match.status = "finished";
  } else if (match.pairBId && !match.pairAId) {
    match.winnerPairId = match.pairBId;
    match.status = "finished";
  }
}

export function phaseForQualifiedCount(count: number): TournamentRound['type'] {
  if (count >= 32) return 'R32';
  if (count >= 16) return 'R16';
  if (count >= 8) return 'QF';
  if (count >= 4) return 'SF';
  return 'FINAL';
}

/**
 * 1° de cada zona → cuartos.
 * 2° (y más) → octavos (empareje aleatorio).
 * Ganadores de octavos + 1° → cuartos (aleatorio), luego semi/final.
 *
 * Los pairId se resuelven por zona terminada (`resolvedGroupIds` o
 * `resolvePairs=true` para todas). Zonas aún en juego quedan como "1° Zona A".
 */
export function isGroupMatchesComplete(
  matches: Match[],
  groupId: string,
): boolean {
  const groupMatches = matches.filter(
    (m) => m.groupId === groupId && m.phase === "GROUP",
  );
  if (groupMatches.length === 0) return false;
  return groupMatches.every(
    (m) => m.status === "finished" || m.status === "walkover",
  );
}

export function listFinishedGroupIds(
  groups: TournamentGroup[],
  matches: Match[],
): string[] {
  return groups
    .filter((g) => isGroupMatchesComplete(matches, g.id))
    .map((g) => g.id);
}

/** Destino en el cuadro según posición de zona (copy UI). */
export function groupQualificationTargetLabel(position: number): string {
  if (position <= 1) return "Pasa a cuartos";
  return "Pasa a octavos";
}

export function buildEliminationBracket(
  categoryId: string,
  groups: TournamentGroup[],
  standings: GroupStanding[],
  qualifyPerGroup: number,
  options?: {
    /** @deprecated Preferir resolvedGroupIds para avance parcial por zona. */
    resolvePairs?: boolean;
    /** Grupos cuyos partidos de zona ya terminaron (se asigna pairId). */
    resolvedGroupIds?: Iterable<string>;
  },
): { rounds: TournamentRound[]; matches: Match[]; slots: MatchSlot[] } {
  const resolved =
    options?.resolvedGroupIds != null
      ? new Set(options.resolvedGroupIds)
      : options?.resolvePairs
        ? new Set(groups.map((g) => g.id))
        : new Set<string>();
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
  const firsts: BracketEntrant[] = [];
  const playIn: BracketEntrant[] = [];

  for (const group of sortedGroups) {
    const rows = standings
      .filter((s) => s.groupId === group.id)
      .sort((a, b) => a.position - b.position);
    const slotsNeeded = Math.max(1, qualifyPerGroup);
    const groupResolved = resolved.has(group.id);
    for (let i = 0; i < slotsNeeded; i++) {
      const row = rows[i];
      const position = row?.position && row.position > 0 ? row.position : i + 1;
      const entrant: BracketEntrant = {
        pairId: groupResolved && row ? row.pairId : null,
        groupId: group.id,
        position,
        sourceMatchId: null,
        sourceType: "GROUP_POSITION",
      };
      if (i === 0) firsts.push(entrant);
      else playIn.push(entrant);
    }
  }

  const seed = hashSeed(
    categoryId + ':' + sortedGroups.map((g) => g.id).join(',') + ':' + String(firsts.length) + ':' + String(playIn.length),
  );

  const rounds: TournamentRound[] = [];
  const matches: Match[] = [];
  const slots: MatchSlot[] = [];

  const pushRound = (type: TournamentRound['type'], name: string) => {
    const round: TournamentRound = {
      id: createId('round'),
      tournamentCategoryId: categoryId,
      name,
      order: rounds.length + 1,
      type,
    };
    rounds.push(round);
    return round;
  };

  let feederMatches: Match[] = [];
  const qfPool: BracketEntrant[] = [...seededShuffle(firsts, seed ^ 0x2222)];

  if (playIn.length >= 2) {
    const r16 = pushRound('R16', 'Octavos de final');
    const shuffled = seededShuffle(playIn, seed ^ 0x1111);
    const bracketSize = nextPowerOfTwo(shuffled.length);
    const padded: (BracketEntrant | null)[] = [...shuffled];
    while (padded.length < bracketSize) padded.push(null);

    const r16Matches: Match[] = [];
    for (let i = 0; i < bracketSize / 2; i++) {
      const match = emptyMatch(categoryId, r16);
      const slotA = applyEntrantToSlot(match, 'A', padded[i * 2]);
      const slotB = applyEntrantToSlot(match, 'B', padded[i * 2 + 1]);
      slots.push(slotA, slotB);
      resolveBye(match, slotA, slotB);
      r16Matches.push(match);
      matches.push(match);
    }
    feederMatches = r16Matches;
    for (const m of feederMatches) {
      qfPool.push({
        pairId: m.winnerPairId,
        groupId: null,
        position: null,
        sourceMatchId: m.id,
        sourceType: 'MATCH_WINNER',
      });
    }
  } else if (playIn.length === 1) {
    qfPool.push(playIn[0]);
  }

  if (qfPool.length === 0) {
    return { rounds, matches, slots };
  }

  let stageMatches: Match[] = [];

  if (qfPool.length === 1) {
    const fin = pushRound('FINAL', 'Final');
    const match = emptyMatch(categoryId, fin);
    const slotA = applyEntrantToSlot(match, 'A', qfPool[0]);
    const slotB = applyEntrantToSlot(match, 'B', null);
    slots.push(slotA, slotB);
    resolveBye(match, slotA, slotB);
    matches.push(match);
    return { rounds, matches, slots };
  }

  if (qfPool.length === 2 && feederMatches.length === 0) {
    stageMatches = [];
    const sf = pushRound('SF', 'Semifinal');
    const match = emptyMatch(categoryId, sf);
    const pair = seededShuffle(qfPool, seed ^ 0x3333);
    slots.push(applyEntrantToSlot(match, 'A', pair[0]), applyEntrantToSlot(match, 'B', pair[1]));
    matches.push(match);
    stageMatches = [match];
  } else {
    const qf = pushRound('QF', 'Cuartos de final');
    // No reshuffle feeders relative to firsts in a way that breaks MATCH_WINNER links:
    // shuffle only pure GROUP_POSITION; keep MATCH_WINNER at end then interleave randomly via seeded order of indices.
    const shuffledQf = seededShuffle(qfPool, seed ^ 0x3333);
    const size = nextPowerOfTwo(Math.max(2, shuffledQf.length));
    const padded: (BracketEntrant | null)[] = [...shuffledQf];
    while (padded.length < size) padded.push(null);
    for (let i = 0; i < size / 2; i++) {
      const match = emptyMatch(categoryId, qf);
      const slotA = applyEntrantToSlot(match, 'A', padded[i * 2]);
      const slotB = applyEntrantToSlot(match, 'B', padded[i * 2 + 1]);
      slots.push(slotA, slotB);
      resolveBye(match, slotA, slotB);
      stageMatches.push(match);
      matches.push(match);
    }
  }

  while (stageMatches.length > 1) {
    const nextType: TournamentRound['type'] = stageMatches.length > 2 ? 'SF' : 'FINAL';
    const nextName = nextType === 'SF' ? 'Semifinal' : 'Final';
    if (stageMatches[0]?.phase === 'FINAL') break;
    const nextRound = pushRound(nextType, nextName);
    const next: Match[] = [];
    for (let i = 0; i < stageMatches.length / 2; i++) {
      const match = emptyMatch(categoryId, nextRound);
      const left = stageMatches[i * 2];
      const right = stageMatches[i * 2 + 1];
      slots.push(
        {
          id: createId('slot'),
          matchId: match.id,
          side: 'A',
          sourceType: 'MATCH_WINNER',
          pairId: left.winnerPairId,
          groupId: null,
          groupPosition: null,
          sourceMatchId: left.id,
        },
        {
          id: createId('slot'),
          matchId: match.id,
          side: 'B',
          sourceType: 'MATCH_WINNER',
          pairId: right.winnerPairId,
          groupId: null,
          groupPosition: null,
          sourceMatchId: right.id,
        },
      );
      match.pairAId = left.winnerPairId;
      match.pairBId = right.winnerPairId;
      next.push(match);
      matches.push(match);
    }
    stageMatches = next;
  }

  return { rounds, matches, slots };
}

export function applyResultToMatch(match: Match, input: MatchResultInput): Match {
  return {
    ...match,
    sets: input.sets.map((s) => ({ ...s })),
    winnerPairId: input.winnerPairId,
    status: "finished",
  };
}

export function applyWalkoverToMatch(
  match: Match,
  winnerPairId: string,
  sets: SetScore[],
): Match {
  return {
    ...match,
    sets: sets.map((s) => ({ ...s })),
    winnerPairId,
    status: "walkover",
  };
}

/** Marcador WO a favor de A o B según setsToWin / gamesPerSet. */
export function walkoverSetsForWinner(
  winnerSide: "A" | "B",
  setsToWin: number,
  gamesPerSet: number,
): SetScore[] {
  const games = Math.max(1, gamesPerSet);
  const count = Math.max(1, setsToWin);
  return Array.from({ length: count }, () =>
    winnerSide === "A"
      ? { gamesA: games, gamesB: 0 }
      : { gamesA: 0, gamesB: games },
  );
}

export function advanceBracketWinner(
  match: Match,
  slots: MatchSlot[],
  matches: Match[],
): { slots: MatchSlot[]; matches: Match[] } {
  if (!match.winnerPairId) return { slots, matches };
  const nextSlots = slots.map((slot) => {
    if (slot.sourceType === "MATCH_WINNER" && slot.sourceMatchId === match.id) {
      return { ...slot, pairId: match.winnerPairId };
    }
    return slot;
  });
  const nextMatches = matches.map((m) => {
    const a = nextSlots.find((s) => s.matchId === m.id && s.side === "A");
    const b = nextSlots.find((s) => s.matchId === m.id && s.side === "B");
    if (!a && !b) return m;
    return {
      ...m,
      pairAId: a?.pairId ?? m.pairAId,
      pairBId: b?.pairId ?? m.pairBId,
    };
  });
  return { slots: nextSlots, matches: nextMatches };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export interface AvailabilityWindow {
  date: string;
  startTime: string;
  endTime: string;
  courtId?: string;
  pairId?: string;
}

export function intersectWindows(
  a: AvailabilityWindow[],
  b: AvailabilityWindow[],
  minDurationMinutes = 60,
): AvailabilityWindow[] {
  const out: AvailabilityWindow[] = [];
  for (const wa of a) {
    for (const wb of b) {
      if (wa.date !== wb.date) continue;
      const start = Math.max(toMinutes(wa.startTime), toMinutes(wb.startTime));
      const end = Math.min(toMinutes(wa.endTime), toMinutes(wb.endTime));
      if (end - start >= minDurationMinutes) {
        const sh = String(Math.floor(start / 60)).padStart(2, "0");
        const sm = String(start % 60).padStart(2, "0");
        const eh = String(Math.floor(end / 60)).padStart(2, "0");
        const em = String(end % 60).padStart(2, "0");
        out.push({
          date: wa.date,
          startTime: `${sh}:${sm}`,
          endTime: `${eh}:${em}`,
          courtId: wa.courtId ?? wb.courtId,
          pairId: wa.pairId ?? wb.pairId,
        });
      }
    }
  }
  return out;
}

/** Días inclusive entre dos fechas ISO `YYYY-MM-DD`. */
export function eachDateInclusive(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return out;
  while (cursor.getTime() <= end.getTime()) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Ventanas sintéticas del torneo (días × franja diaria). */
export function buildTournamentDayWindows(input: {
  startDate: string;
  endDate: string | null;
  dailyStartTime: string;
  dailyEndTime: string;
}): AvailabilityWindow[] {
  const end = input.endDate ?? input.startDate;
  return eachDateInclusive(input.startDate, end).map((date) => ({
    date,
    startTime: input.dailyStartTime,
    endTime: input.dailyEndTime,
  }));
}
