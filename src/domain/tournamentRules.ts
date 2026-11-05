import type {
  DrawRules,
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

/** Hay un partido con resultado o en cancha: el club no suma parejas al cuadro. */
export const ADMISSION_CLOSED_AFTER_PLAYED_REASON =
  "Hay partidos con resultado. No se pueden sumar parejas.";

/** Hay partidos con resultado: no se edita la pareja. */
export const PAIR_EDIT_PLAYED_REASON =
  "Hay partidos con resultado. No se puede editar la pareja.";

/** Aviso en Participantes si había zonas armadas y el roster cambió (torneo aún no comenzó). */
export const DRAW_REBUILD_ON_ADD_NOTICE =
  "Si ya había zonas armadas, al sumar o sacar una pareja aceptada quedan desactualizadas: hay que rearmarlas antes de comenzar.";

/** Confirmación al cambiar el roster con zonas ya armadas (torneo aún no comenzó). */
export const DRAW_REBUILD_WARNING =
  "Si ya había zonas armadas, al confirmar quedan desactualizadas y hay que rearmarlas antes de comenzar.";

/**
 * Torneo comenzado sin partidos jugados: la pareja entra aceptada pero no al cuadro.
 * Hay que deshacer el comienzo para poder rearmar.
 */
export const STARTED_OUT_OF_DRAW_NOTICE =
  "Con el torneo comenzado, las parejas nuevas quedan aceptadas pero fuera del cuadro. Para incluirlas en las zonas: usá «Deshacer comienzo», rearmá las zonas y volvé a comenzar.";

/** Confirmación al sumar/aceptar con torneo comenzado y sin partidos jugados. */
export const STARTED_OUT_OF_DRAW_WARNING =
  "La pareja queda aceptada pero fuera del cuadro. Para sumarla en las zonas tenés que deshacer el comienzo, rearmar las zonas y volver a comenzar.";

/** Tope del torneo puntuable (preset Estándar). */
export const SCORING_PAIR_COUNT_REASON =
  "Un torneo puntuable admite entre 16 y 32 parejas.";

/** Línea extra si el alta sube el cupo en el mismo paso. */
export function drawRebuildCupIncreaseItem(from: number, to: number) {
  return `El número de participantes pasa de ${from} a ${to}.`;
}

/** Ítems del aviso al sentar una pareja en el cuadro sin partidos jugados (antes de comenzar). */
export function drawRebuildWarningItems(cupFrom: number | null): string[] {
  const items = [DRAW_REBUILD_WARNING];
  if (cupFrom != null)
    items.push(drawRebuildCupIncreaseItem(cupFrom, cupFrom + 1));
  return items;
}

/** Ítems del aviso al sumar/aceptar con torneo comenzado y cuadro aún editable. */
export function startedOutOfDrawWarningItems(cupFrom: number | null): string[] {
  const items = [STARTED_OUT_OF_DRAW_WARNING];
  if (cupFrom != null)
    items.push(drawRebuildCupIncreaseItem(cupFrom, cupFrom + 1));
  return items;
}

/** Texto de «Comenzar torneo»: exige zonas ya armadas (ready). */
export function startTournamentDescription(
  acceptedPairs: number,
  acceptedSoloPlayers: number,
) {
  const solos =
    acceptedSoloPlayers > 0
      ? ` Hay ${acceptedSoloPlayers} jugadores sin pareja: se emparejan entre sí por orden de inscripción aunque jueguen del mismo lado; si queda uno impar, queda afuera.`
      : "";
  return `Se cierra la inscripción y el torneo arranca con el armado de zonas ya confirmado (${acceptedPairs} parejas).${solos} Los jugadores ya no se pueden anotar. Podés deshacer el comienzo mientras no haya partidos jugados.`;
}

/** True si el formato usa armado de zonas / fixture de grupos. */
export function formatUsesZoneStructure(
  format: string | null | undefined,
): boolean {
  return format === "GROUPS_ELIMINATION" || format === "ROUND_ROBIN";
}

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

/** El club cerró la inscripción: el jugador debe hablar con el club. */
export const PLAYER_REGISTRATION_CLOSED_BY_CLUB_REASON =
  "El club cerró tu inscripción en esta categoría. Hablá con el club para que la reabra o te vuelva a sumar.";

/** True si el jugador no puede auto-inscribirse con este estado. */
export function playerSelfRegisterBlocked(
  status: RegistrationStatus | undefined,
  cancelledBy?: "player" | "club" | null,
): boolean {
  if (status === "REJECTED" || status === "DISQUALIFIED") return true;
  return status === "CANCELLED" && cancelledBy === "club";
}

/**
 * True si esta inscripción rechazada es la más reciente de cada jugador de la pareja
 * entre las filas visibles (misma regla que la API para Deshacer rechazo).
 */
export function canReopenRejectedRegistration(
  registration: {
    id: string;
    status: RegistrationStatus;
    registeredAt: string;
  },
  pair: { player1Id: string; player2Id: string | null },
  rows: Array<{
    pair: { player1Id: string; player2Id: string | null };
    registration: { id: string; registeredAt: string } | null;
  }>,
): boolean {
  if (registration.status !== "REJECTED") return false;
  const playerIds = [pair.player1Id, pair.player2Id].filter(
    (id): id is string => Boolean(id),
  );
  for (const playerId of playerIds) {
    let latest: { id: string; registeredAt: string } | null = null;
    for (const row of rows) {
      const reg = row.registration;
      if (!reg) continue;
      const onPair =
        row.pair.player1Id === playerId || row.pair.player2Id === playerId;
      if (!onPair) continue;
      if (
        !latest ||
        reg.registeredAt > latest.registeredAt ||
        (reg.registeredAt === latest.registeredAt && reg.id > latest.id)
      ) {
        latest = reg;
      }
    }
    if (!latest || latest.id !== registration.id) return false;
  }
  return true;
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
  if (!tournamentStarted)
    return "El torneo todavía no comenzó: el cuadro se arma al comenzar.";
  const derivedGroup =
    (match.phase === "GROUP" || !match.roundId) &&
    slots.some(
      (slot) =>
        slot.matchId === match.id &&
        (slot.sourceType === "MATCH_WINNER" ||
          slot.sourceType === "MATCH_LOSER"),
    );
  if (derivedGroup)
    return "Este partido lo definen el ganador y el perdedor de los anteriores.";
  if (match.status === "finished" || match.status === "inProgress")
    return "El partido ya se jugó o está en juego.";
  if (match.status === "cancelled") return "El partido está cancelado.";
  if (match.status === "walkover") {
    const isBye = slots.some(
      (slot) => slot.matchId === match.id && slot.sourceType === "BYE",
    );
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
  const bye = slots.some(
    (slot) => slot.matchId === match.id && slot.sourceType === "BYE",
  );
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
  if (!tournamentStarted)
    return "Las parejas se mueven con el torneo comenzado.";
  if (match.status === "cancelled") return "Ese partido no está en el cuadro.";
  if (!match.pairAId && !match.pairBId)
    return "Todavía no hay una pareja en este cruce.";
  if (matchHasRealPlay(match, slots)) return "Esa pareja ya jugó.";
  if (match.phase === "GROUP" && match.groupId) {
    const zonePlayed = zoneMatches.some(
      (item) => item.groupId === match.groupId && matchHasRealPlay(item, slots),
    );
    if (zonePlayed)
      return "No se puede cambiar de zona: esta zona ya tiene partidos jugados.";
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
    if (match.status === "finished" || match.status === "inProgress")
      return true;
    if (match.status !== "walkover") return false;
    const bye = slots.some(
      (slot) => slot.matchId === match.id && slot.sourceType === "BYE",
    );
    return !bye;
  });
  return locked
    ? "No se puede rearmar la llave porque ya hay partidos jugados."
    : null;
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
        rules.tiebreakEnabled
          ? `; a ${rules.gamesPerSet}-${rules.gamesPerSet} se define por tie-break a ${rules.tiebreakPoints}`
          : ""
      }.`,
    );
  } else {
    items.push(
      `Partidos al mejor de ${rules.setsToWin * 2 - 1} sets, a ${rules.gamesPerSet} games${
        rules.tiebreakEnabled
          ? ` con tie-break a ${rules.tiebreakPoints} en ${rules.gamesPerSet}-${rules.gamesPerSet}`
          : ""
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

function zoneItems(format: TournamentFormat, drawRules: DrawRules): string[] {
  const base = [
    "Puntos de zona, por partido: 2 si ganó, 1 si lo perdió jugando, 0 si no se presentó (W.O.). No suman sets, games ni el tie-break.",
    "Para la tabla, un no presentado (W.O.) vale 6/0 por set que haga falta ganar.",
    "Si una pareja se retira o es descalificada, se anulan todos sus partidos (jugados y pendientes): el rival gana por W.O. 6/0 por set que haga falta ganar, y la pareja queda última en la zona.",
  ];
  if (format === "GROUPS_ELIMINATION") {
    const zoneOfFour =
      drawRules === "FAP"
        ? "Zona de 4: primero 1 vs 4 y 2 vs 3; después ganador vs ganador y perdedor vs perdedor. Quien gana los dos partidos es 1°; quien pierde los dos queda último (salvo descalificación). Pasan dos."
        : "Zona de 4: todos contra todos (6 partidos). Primera jornada 1 vs 4 y 2 vs 3; después 1 vs 3 y 2 vs 4; al final 1 vs 2 y 3 vs 4. Pasan dos.";
    return [
      "Con 5 parejas se arma una sola zona todos contra todos, sin llave: el 1° es campeón. Dos o más zonas, a partir de 6 parejas.",
      "Las zonas se arman con «Armar zonas» (sorteo FIP). En fechas de ranking se usan los puntos; en torneos sueltos, el seed de la pareja. Con múltiplo de 3, todas de 3; si sobra 1, hay una zona de 4; si sobran 2, dos de 4.",
      "Zona de 3: todos contra todos. Pasan dos.",
      zoneOfFour,
      ...base,
    ];
  }
  return [
    "Las zonas se arman con «Armar zonas» (sorteo FIP). En fechas de ranking se usan los puntos; en torneos sueltos, el seed de la pareja.",
    "Una sola zona, todos contra todos. El orden final de la tabla es el resultado del torneo.",
    ...base,
  ];
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

const FAP_ZONE_OF_FOUR_TIE_BREAK_ITEMS = [
  "En zona de 4: 1° es quien ganó los dos partidos; último quien perdió los dos (salvo descalificación).",
  "Para 2° y 3°: primero el partido entre ellas (siempre se enfrentaron); después diferencia de sets, diferencia de games, games a favor y, si hace falta, sorteo del club.",
  "Zona de 3: mismos criterios que el reglamento por puntos (partido directo, sets y games entre empatadas, games de toda la zona, sorteo).",
];

/** Hint corto de la tabla de zonas según el motor. */
export function standingsHint(drawRules: DrawRules = "FIP"): string {
  if (drawRules === "FAP") {
    return "Zona de 4: 1° gana los dos partidos; último pierde los dos. Entre 2° y 3° decide el partido directo, después sets y games. Zona de 3: por puntos (2/1/0), directo, sets y games.";
  }
  return "Se ordena por puntos de zona: 2 si ganó el partido, 1 si lo perdió jugando, 0 si no se presentó (W.O.). Entre dos empatadas, el partido directo; entre tres o más, sets y games solo entre ellas, luego games de toda la zona. Si todo sigue igual, el club sortea desde acá.";
}

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
 * Reglamento general de la categoría, por secciones, según formato, reglas de partido y motor FIP/FAP.
 * Es texto para la UI (modal de reglas); las validaciones reales las hace la API.
 */
export function tournamentRulesSections(
  format: TournamentFormat,
  rules: MatchRules,
  drawRules: DrawRules = "FIP",
): RulesSection[] {
  const sections: RulesSection[] = [
    { title: "Formato de partido", items: matchFormatItems(rules) },
  ];
  if (format !== "DIRECT_ELIMINATION") {
    sections.push({
      title: "Zonas y puntos",
      items: zoneItems(format, drawRules),
    });
    sections.push({
      title: "Desempate en la tabla",
      items:
        drawRules === "FAP"
          ? FAP_ZONE_OF_FOUR_TIE_BREAK_ITEMS
          : rules.setsToWin === 1
            ? QUALITY_TIE_BREAK_ITEMS
            : TIE_BREAK_ITEMS,
    });
  }
  const bracket = bracketItems(format);
  if (bracket.length) {
    sections.push({
      title:
        format === "DIRECT_ELIMINATION"
          ? "Cuadro"
          : "Cruces después de las zonas",
      items: bracket,
    });
  }
  const startItems =
    format === "DIRECT_ELIMINATION"
      ? [
          "El cupo cuenta parejas completas más jugadores solos de a dos.",
          "Las inscripciones se cortan cuando el cupo de aceptadas está lleno y hay 2 suplentes. Si el torneo comenzó, finalizó o está cancelado, tampoco se puede inscribir.",
          "«Comenzar torneo» cierra la inscripción y arranca el cuadro.",
          "Los jugadores solos que no consiguieron pareja se emparejan entre sí por orden de inscripción, aunque jueguen del mismo lado; si queda uno impar, queda afuera.",
          "Con el torneo comenzado no entra una pareja nueva: el cuadro ya está armado.",
          "Con el torneo comenzado, una pareja aceptada no se elimina: se desclasifica.",
          "Se puede deshacer el comienzo mientras no haya partidos jugados.",
        ]
      : [
          "El cupo cuenta parejas completas más jugadores solos de a dos.",
          "Las inscripciones se cortan cuando el cupo de aceptadas está lleno y hay 2 suplentes. Si el torneo comenzó, finalizó o está cancelado, tampoco se puede inscribir.",
          "Antes de comenzar hay que armar las zonas (mínimo 3 parejas en torneo suelto; 6 en fecha de ranking). «Comenzar torneo» cierra la inscripción y arranca con ese armado.",
          "Los jugadores solos que no consiguieron pareja se emparejan entre sí por orden de inscripción, aunque jueguen del mismo lado; si queda uno impar, queda afuera.",
          "Si se suman o sacan parejas después de armar, las zonas quedan desactualizadas y hay que rearmarlas.",
          "Con el torneo comenzado no entra una pareja nueva: el cuadro ya está armado.",
          "Con el torneo comenzado, una pareja aceptada no se elimina: se desclasifica.",
          "Se puede deshacer el comienzo mientras no haya partidos jugados.",
        ];
  sections.push({
    title: "Inscripción y comienzo",
    items: startItems,
  });
  return sections;
}
