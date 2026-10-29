import type { Match, MatchRules, MatchSlot, TieBreaker, TournamentFormat } from "./types";

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
  if (match.phase === "GROUP" || !match.roundId)
    return "Los partidos de zona no se cruzan a mano: los define la zona.";
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
 * Por qué no se puede rearmar la llave (mover parejas o agregar/quitar fases).
 * Un clasificó por bye no cuenta: ese cruce no se jugó.
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
      return "Ubicada por puntos: ganado 2, perdido 1, no presentado 0.";
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
    "Puntos por partido: ganado 2, perdido 1, no presentado (W.O.) 0.",
    "Para la tabla, un W.O. vale 6/0 por set que haga falta ganar.",
    "Si una pareja se retira o es descalificada, sus partidos pendientes se adjudican al rival y queda última en la zona.",
  ];
  if (format === "GROUPS_ELIMINATION") {
    return [
      "Las zonas se arman por orden de inscripción: con múltiplo de 3, todas de 3; si sobra 1, la zona A tiene 4; si sobran 2, las zonas A y B tienen 4.",
      "Zona de 3: todos contra todos.",
      "Zona de 4: 1° vs 4° y 2° vs 3°; después ganadores entre sí y perdedores entre sí. Pasan tres.",
      ...base,
    ];
  }
  return ["Una sola zona, todos contra todos. El orden final de la tabla es el resultado del torneo.", ...base];
}

const TIE_BREAK_ITEMS = [
  "1. Puntos.",
  "2. Si empatan dos parejas: el partido entre ellas.",
  "3. Si empatan tres o más: diferencia de sets contando solo los partidos entre las empatadas.",
  "4. Si persiste: diferencia de games, también solo entre las empatadas. Si una se despega y quedan dos, vuelve a decidir el partido entre ellas.",
  "5. Si persiste: diferencia de games de toda la zona y luego games a favor.",
  "6. Si todo sigue igual: el club fija el orden (sorteo) desde la tabla. Hasta entonces, esas posiciones no pasan al cuadro.",
];

const QUALITY_TIE_BREAK_ITEMS = [
  "1. Puntos.",
  "2. Si empatan dos parejas: el partido entre ellas.",
  "3. Si empatan tres o más: como cada partido es a un set, decide la diferencia de games contando solo los partidos entre las empatadas.",
  "4. Si persiste: diferencia de games de toda la zona y luego games a favor.",
  "5. Si todo sigue igual: el club fija el orden (sorteo) desde la tabla.",
];

function bracketItems(format: TournamentFormat): string[] {
  if (format === "DIRECT_ELIMINATION") {
    return [
      "El cuadro se arma por orden de inscripción. Si la cantidad no es potencia de 2, las primeras parejas pasan la primera ronda sin jugar (bye).",
      "El que pierde queda eliminado; el ganador pasa a la siguiente ronda.",
      "El club puede modificar un cruce todavía no jugado desde el cuadro, solo con parejas aceptadas que estén dentro del cuadro.",
    ];
  }
  if (format === "GROUPS_ELIMINATION") {
    return [
      "De cada zona de 3 pasan dos; de cada zona de 4 pasan tres.",
      "El cuadro se arma con la cantidad de clasificados llevada a la potencia de 2 siguiente; los lugares que sobran son byes para los mejores ubicados.",
      "Primeros contra segundos cruzados entre zonas: nunca se repite un cruce de la misma zona en la primera ronda.",
      "Si una pareja pasa sin rival, el club la marca como «Clasificó» en ese cruce.",
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
      "Con el torneo comenzado, una pareja nueva solo entra en una zona que todavía no jugó; los partidos jugados no se tocan.",
    ],
  });
  return sections;
}
