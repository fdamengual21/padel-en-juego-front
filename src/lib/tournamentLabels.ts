export function roundSectionLabel(
  type: string,
  fallbackName?: string,
): string {
  switch (type) {
    case "R32":
      return "Dieciseisavos";
    case "R16":
      return "Octavos de final";
    case "QF":
      return "Cuartos de final";
    case "SF":
      return "Semifinal";
    case "FINAL":
      return "Final";
    case "PLAY_IN":
      return "Previas";
    case "CONSOLATION":
      return "Consolación";
    case "GROUP":
      return "Zonas";
    default:
      return fallbackName ?? type;
  }
}

export function sidePreferenceLabel(
  value: "drive" | "reves" | "any" | null | undefined,
): string {
  switch (value) {
    case "drive":
      return "Drive";
    case "reves":
      return "Revés";
    case "any":
      return "Cualquiera";
    default:
      return "Cualquiera";
  }
}
