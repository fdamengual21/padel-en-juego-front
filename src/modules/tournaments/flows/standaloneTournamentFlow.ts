import { ROUTES } from "@/router/routes";
import type { TournamentFlow } from "./types";

export const standaloneTournamentFlow: TournamentFlow = {
  kind: "standalone",
  backTo: ROUTES.club.tournaments,
  copy: {
    backLabel: "← Volver a torneos",
    cancelButton: "Cancelar torneo",
    cancelTitle: "Cancelar torneo",
    cancelDescription:
      "El torneo queda cancelado. No se asignan puntos ni cuenta en el historial de los jugadores. Esta acción no se deshace.",
    cancelSuccess: "Torneo cancelado",
    cancelError: "No se pudo cancelar el torneo",
    configNotice: null,
  },
  form: {
    singleDay: false,
    lockCategory: false,
    lockMatchPlayType: false,
    lockFormat: false,
    minPairs: 2,
    maxPairsHint: null,
    lockedHint: null,
    validate: () => null,
  },
  saveWarnings: () => [],
  relatedQueries: [],
};
