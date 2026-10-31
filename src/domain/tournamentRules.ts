import type {
  Match,
  MatchRules,
  MatchSlot,
  RegistrationStatus,
  TieBreaker,
  TournamentFormat,
} from "./types";

/** Aviso al club cuando el cupo queda en cinco: una zona todos contra todos, sin llave. */
export const FIVE_PAIR_ZONE_NOTICE =
  "Quedan 5 parejas. Se arma una sola zona todos contra todos. Las dos zonas se arman a partir de 6 parejas.";

/** Aviso si el cupo queda en cinco pero ya hay partidos jugados. */
export const FIVE_PAIR_ZONE_BLOCKED_NOTICE =
  "Quedan 5 parejas, pero no se puede rearmar el cuadro porque ya hay partidos jugados.";

/** Con el torneo comenzado, una pareja aceptada no se da de baja: se desclasifica. */
export const REMOVE_ACCEPTED_AFTER_START_REASON =
  "El torneo ya comenzó. Para sacar a una pareja aceptada, desclasificala.";

/** Mover a una zona que ya tiene 4 dejaría 5. */
export const ZONE_MOVE_DEST_FULL_REASON = "Esa zona ya tiene 4 parejas.";

/** Mover desde una zona de 3 dejaría 2. */
export const ZONE_MOVE_ORIGIN_WOULD_HAVE_TWO_REASON =
  "La zona de origen quedaría con 2 parejas.";

/**
 * Por qué no se puede mover por tamaño de zona. Null si el 4→3 es válido.
 * Refleja `ZoneMoveSizeBlockedReason` de la API.
 */
export function zoneMoveSizeBlockedReason(
  originActive: number | null,
  destActive: number,
): string | null {
  if (destActive >= 4) return ZONE_MOVE_DEST_FULL_REASON;
  if (originActive != null && originActive - 1 < 3)
    return ZONE_MOVE_ORIGIN_WOULD_HAVE_TWO_REASON;
  return null;
}

/**
 * Por qué no se puede dar de baja una inscripción. Null si se puede.
 * Refleja las guardas de la API: pareja aceptada con torneo comenzado, solo desclasificar.
 */
export function removeAcceptedPairBlockedReason(
  tournamentStarted: boolean,
  status: RegistrationStatus | undefined,
): string | null {
  if (!tournamentStarted || status !== "ACCEPTED") return null;
  return REMOVE_ACCEPTED_AFTER_START_REASON;
}

/**
 * Por qué no se puede fijar a mano el cruce de un partido. Null si se puede.
 * Refleja las guardas de la API para que la UI muestre el motivo antes de pedir.
 */
export function matchPairingBlockedReason(
  match: Match,
  slots: MatchSlot[],
  tournamentStarted: boolean,
): string | null {
  if (!tournamentStarted) return "El torneo todavía no comenzó: el cuadro se arma al comenzar.";
  const derivedGroup =
    (match.phase === "GROUP" || !match.roundId) &&
    slots.some(
      (slot) =>
        slot.matchId === match.id &&
        (slot.sourceType === "MATCH_WINNER" || slot.sourceType === "MATCH_LOSER"),
    );
  if (derivedGroup)
    return "Este partido lo definen el ganador y el perdedor de los anteriores.";
  if (match.status === "finished" || match.status === "inProgress")
    return "El partido ya se jugó o está en juego.";
  if (match.status === "cancelled") return "El partido está cancelado.";
  if (match.status === "walkover") {
    const isBye = slots.some((slot) => slot.matchId === match.id && slot.sourceType === "BYE");
    if (!isBye) return "El partido tiene un W.O. cargado.";
  }
  return null;
}

/**
 * Por qué no se puede cambiar o sacar quién clasificó. Null si se puede.
 */
export function qualifyChangeBlockedReason(
  match: Pick<Match, "id">,
  matches: Pick<Match, "id" | "status">[],
  slots: Pick<MatchSlot, "matchId" | "sourceType" | "sourceMatchId">[],
): string | null {
  const successor = matches.find((item) =>
    slots.some(
      (slot) =>
        slot.matchId === item.id &&
        slot.sourceType === "MATCH_WINNER" &&
        slot.sourceMatchId === match.id,
    ),
  );
  if (!successor || !matchHasRealPlay(successor, slots)) return null;
  return "No se puede cambiar quién clasificó: la siguiente ronda ya se jugó.";
}

function matchHasRealPlay(
  match: Pick<Match, "id" | "status">,
  slots: Pick<MatchSlot, "matchId" | "sourceType">[],
): boolean {
  if (match.status === "finished" || match.status === "inProgress") return true;
  if (match.status !== "walkover") return false;
  const bye = slots.some((slot) => slot.matchId === match.id && slot.sourceType === "BYE");
  return !bye;
}

/**
 * Por qué no se puede abrir Mover en este partido. Null si el modal se puede abrir.
 */
export function matchMoveBlockedReason(
  match: Match,
  slots: Pick<MatchSlot, "matchId" | "sourceType">[],
  tournamentStarted: boolean,
  rebuildBlockedReason: string | null,
  zoneMatches: Pick<Match, "id" | "groupId" | "status">[] = [],
): string | null {
  if (!tournamentStarted) return "Las parejas se mueven con el torneo comenzado.";
  if (match.status === "cancelled") return "Ese partido no está en el cuadro.";
  if (!match.pairAId && !match.pairBId) return "Todavía no hay una pareja en este cruce.";
  if (matchHasRealPlay(match, slots)) return "Esa pareja ya jugó.";
  if (match.phase === "GROUP" && match.groupId) {
    const zonePlayed = zoneMatches.some(
      (item) => item.groupId === match.groupId && matchHasRealPlay(item, slots),
    );
    if (zonePlayed) return "No se puede cambiar de zona: esta zona ya tiene partidos jugados.";
  }
  if (rebuildBlockedReason) return rebuildBlockedReason;
  return null;
}

/**
 * Por qué no se puede rearmar la llave (mover parejas o agregar/quitar fases).
 * Un «Clasificó» sin rival no cuenta: ese cruce no se jugó.
 */
export function knockoutRebuildBlockedReason(
  matches: Pick<Match, "id" | "roundId" | "status">[],
  slots: Pick<MatchSlot, "matchId" | "sourceType">[],
): string | null {
  const locked = matches.some((match) => {
    if (!match.roundId) return false;
    if (match.status === "finished" || match.status === "inProgress") return true;
    if (match.status !== "walkover") return false;
    const bye = slots.some((slot) => slot.matchId === match.id && slot.sourceType === "BYE");
    return !bye;
  });
  return locked ? "No se puede rearmar la llave porque ya hay partidos jugados." : null;
}

/** Etiqueta corta del criterio que ubicó a una pareja en la tabla. */
export function tieBreakLabel(code: TieBreaker): string {
  switch (code) {
    case "POINTS":
      return "Puntos";
    case "HEAD_TO_HEAD":
      return "Directo";
    case "SET_DIFFERENCE":
      return "Dif. sets";
    case "GAME_DIFFERENCE":
      return "Dif. games";
    case "TOTAL_GAME_DIFFERENCE":
      return "Dif. games total";
    case "TOTAL_GAMES_WON":
      return "Games a favor";
    case "MANUAL":
      return "Sorteo";
    case "UNRESOLVED":
      return "Empate";
  }
}

/** Explicación del criterio, para el tooltip de la fila. */
export function tieBreakHint(code: TieBreaker, note?: string | null): string {
  switch (code) {
    case "POINTS":
      return "Ubicada por puntos de zona: 2 si ganó el partido, 1 si lo perdió jugando, 0 si no se presentó (W.O.).";
    case "HEAD_TO_HEAD":
      return "Empate en puntos entre dos parejas: decide el partido que jugaron entre ellas.";
    case "SET_DIFFERENCE":
      return "Empate en puntos entre tres o más: decide la diferencia de sets contando solo los partidos entre las empatadas.";
    case "GAME_DIFFERENCE":
      return "Empate en puntos y en sets entre las empatadas: decide la diferencia de games en los partidos entre ellas.";
    case "TOTAL_GAME_DIFFERENCE":
      return "Siguen iguales entre ellas: decide la diferencia de games de toda la zona.";
    case "TOTAL_GAMES_WON":
      return "Siguen iguales: decide la cantidad de games a favor en toda la zona.";
    case "MANUAL":
      return note
        ? `El reglamento no alcanzó y el club fijó el orden: ${note}`
        : "El reglamento no alcanzó y el club fijó el orden (sorteo).";
    case "UNRESOLVED":
      return "El reglamento no alcanzó para desempatar. El club tiene que fijar el orden (sorteo) para que las posiciones pasen al cuadro.";
  }
}

export interface RulesSection {
  title: string;
  items: string[];
}

export function tournamentFormatLabel(format: TournamentFormat): string {
  switch (format) {
    case "GROUPS_ELIMINATION":
      return "Zonas + eliminación";
    case "DIRECT_ELIMINATION":
      return "Eliminación directa";
    case "ROUND_ROBIN":
      return "Todos contra todos";
  }
}

function matchFormatItems(rules: MatchRules): string[] {
  const items: string[] = [];
  if (rules.setsToWin === 1) {
    items.push(
      `Cada partido se juega a un set de ${rules.gamesPerSet} games${
        rules.tiebreakEnabled ? `; a ${rules.gamesPerSet}-${rules.gamesPerSet} se define por tie-break a ${rules.tiebreakPoints}` : ""
      }.`,
    );
  } else {
    items.push(
      `Partidos al mejor de ${rules.setsToWin * 2 - 1} sets, a ${rules.gamesPerSet} games${
        rules.tiebreakEnabled ? ` con tie-break a ${rules.tiebreakPoints} en ${rules.gamesPerSet}-${rules.gamesPerSet}` : ""
      }.`,
    );
    if (rules.superTiebreakEnabled) {
      items.push(
        `Con un set por lado, el tercero se reemplaza por un super tie-break a ${rules.superTiebreakPoints}${
          rules.superTiebreakWinByTwo ? " (diferencia de 2)" : ""
        }.`,
      );
    }
  }
  items.push(
    rules.goldenPoint
      ? "En 40 iguales se juega punto de oro: un solo punto define el game."
      : "En 40 iguales se juega con ventaja: hacen falta dos puntos seguidos.",
  );
  return items;
}

function zoneItems(format: TournamentFormat): string[] {
  const base = [
    "Puntos de zona, por partido: 2 si ganó, 1 si lo perdió jugando, 0 si no se presentó (W.O.). No suman sets, games ni el tie-break.",
    "Para la tabla, un no presentado (W.O.) vale 6/0 por set que haga falta ganar.",
    "Si una pareja se retira o es descalificada, se anulan todos sus partidos (jugados y pendientes): el rival gana por W.O. 6/0 por set que haga falta ganar, y la pareja queda última en la zona.",
  ];
  if (format === "GROUPS_ELIMINATION") {
    return [
      "Con 5 parejas se arma una sola zona todos contra todos, sin llave: el 1° es campeón. Dos o más zonas, a partir de 6 parejas.",
      "Las zonas se arman por orden de inscripción: con múltiplo de 3, todas de 3; si sobra 1, la zona A tiene 4; si sobran 2, las zonas A y B tienen 4.",
      "Zona de 3: todos contra todos. Pasan dos.",
      "Zona de 4: todos contra todos (6 partidos). Primera jornada 1 vs 4 y 2 vs 3; después 1 vs 3 y 2 vs 4; al final 1 vs 2 y 3 vs 4. Pasan dos.",
      ...base,
    ];
  }
  return ["Una sola zona, todos contra todos. El orden final de la tabla es el resultado del torneo.", ...base];
}

const TIE_BREAK_ITEMS = [
  "1. Puntos de zona (2 si ganó, 1 si perdió jugando, 0 si no se presentó).",
  "2. Si empatan dos parejas: el partido entre ellas.",
  "3. Si empatan tres o más: diferencia de sets contando solo los partidos entre las empatadas.",
  "4. Si persiste: diferencia de games, también solo entre las empatadas. Si una se despega y quedan dos, vuelve a decidir el partido entre ellas.",
  "5. Si persiste: diferencia de games de toda la zona y luego games a favor.",
  "6. Si todo sigue igual: el club fija el orden (sorteo) desde la tabla. Hasta entonces, esas posiciones no pasan al cuadro.",
];

const QUALITY_TIE_BREAK_ITEMS = [
  "1. Puntos de zona (2 si ganó, 1 si perdió jugando, 0 si no se presentó).",
  "2. Si empatan dos parejas: el partido entre ellas.",
  "3. Si empatan tres o más: como cada partido es a un set, decide la diferencia de games contando solo los partidos entre las empatadas.",
  "4. Si persiste: diferencia de games de toda la zona y luego games a favor.",
  "5. Si todo sigue igual: el club fija el orden (sorteo) desde la tabla.",
];

function bracketItems(format: TournamentFormat): string[] {
  if (format === "DIRECT_ELIMINATION") {
    return [
      "El cuadro se arma por orden de inscripción. Si no cierran los cruces de la primera ronda, las primeras inscriptas pasan sin jugar: el cruce se marca «Clasificó». No se cruzan entre sí.",
      "El que pierde queda eliminado; el ganador pasa a la siguiente ronda.",
      "El club puede modificar un cruce todavía no jugado desde el cuadro, solo con parejas aceptadas que estén dentro del cuadro. Si ya pasó como «Clasificó», puede cambiar quién pasa mientras la siguiente ronda no se haya jugado.",
    ];
  }
  if (format === "GROUPS_ELIMINATION") {
    return [
      "Con 5 parejas no hay cuadro: el 1° de la zona es campeón.",
      "De cada zona pasan dos. Las rondas de la llave las arma el cupo de clasificados, no las inscriptas: octavos a partir de 9 clasificados (16 inscriptas o más).",
      "En la primera ronda, 1° contra 2° de otra zona. Los 1° van primero (A, después B…) y se ven lo más tarde posible. Nunca se repite un cruce de la misma zona.",
      "Si hay más lugares que clasificados, los 1° de las primeras zonas pasan sin jugar: el cruce se marca «Clasificó». No se cruzan entre sí; se ven más adelante. El club puede cambiar quién pasa o sacar esa marca mientras la siguiente ronda no se haya jugado.",
      "El club puede modificar un cruce todavía no jugado desde el cuadro, solo con parejas aceptadas que estén dentro del cuadro. Si la pareja ya estaba en otro cruce de la ronda, se intercambian.",
    ];
  }
  return [];
}

/**
 * Reglamento general de la categoría, por secciones, según formato y reglas de partido.
 * Es texto para la UI (modal de reglas); las validaciones reales las hace la API.
 */
export function tournamentRulesSections(
  format: TournamentFormat,
  rules: MatchRules,
): RulesSection[] {
  const sections: RulesSection[] = [
    { title: "Formato de partido", items: matchFormatItems(rules) },
  ];
  if (format !== "DIRECT_ELIMINATION") {
    sections.push({ title: "Zonas y puntos", items: zoneItems(format) });
    sections.push({
      title: "Desempate en la tabla",
      items: rules.setsToWin === 1 ? QUALITY_TIE_BREAK_ITEMS : TIE_BREAK_ITEMS,
    });
  }
  const bracket = bracketItems(format);
  if (bracket.length) {
    sections.push({
      title: format === "DIRECT_ELIMINATION" ? "Cuadro" : "Cruces después de las zonas",
      items: bracket,
    });
  }
  sections.push({
    title: "Inscripción y comienzo",
    items: [
      "El cupo cuenta parejas completas más jugadores solos de a dos.",
      "Las inscripciones se cortan cuando el cupo de aceptadas está lleno y hay 2 suplentes. Si el torneo comenzó, finalizó o está cancelado, tampoco se puede inscribir.",
      "El torneo comienza solo con «Comenzar torneo»: ahí se cierra la inscripción y se arma el cuadro definitivo con las parejas aceptadas, por orden de inscripción.",
      "Los jugadores solos que no consiguieron pareja se emparejan entre sí por orden de inscripción, aunque jueguen del mismo lado; si queda uno impar, queda afuera.",
      "Con el torneo comenzado no entra una pareja nueva: el cuadro ya está armado.",
      "Con el torneo comenzado, una pareja aceptada no se elimina: se desclasifica.",
    ],
  });
  return sections;
}
