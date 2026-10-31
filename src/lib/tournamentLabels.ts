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

/** Lado que falta para completar la pareja (el opuesto al que declaró el solo). */
export function soughtSidePreference(
  value: "drive" | "reves" | "any" | null | undefined,
): "drive" | "reves" | "any" {
  if (value === "drive") return "reves";
  if (value === "reves") return "drive";
  return "any";
}

export function seekingPartnerLabel(
  value: "drive" | "reves" | "any" | null | undefined,
): string {
  switch (soughtSidePreference(value)) {
    case "drive":
      return "Busca un drive";
    case "reves":
      return "Busca un revés";
    default:
      return "Busca cualquiera";
  }
}

export function playerSidePreferenceShortLabel(
  primary: "drive" | "reves" | null | undefined,
  secondary?: "drive" | "reves" | null,
): string {
  if (!primary) return "Sin preferencia";
  const primaryLabel = primary === "drive" ? "Drive" : "Revés";
  if (secondary && secondary !== primary) {
    return `${primaryLabel} + ${secondary === "drive" ? "Drive" : "Revés"}`;
  }
  return primaryLabel;
}
