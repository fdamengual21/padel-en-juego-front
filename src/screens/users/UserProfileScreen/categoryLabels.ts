import type { PlayerCategoryChangeReason } from "@core-api";

export const CATEGORY_CHANGE_REASON_LABEL: Record<
  PlayerCategoryChangeReason,
  string
> = {
  initial: "Asignación inicial",
  self_update: "Actualización del jugador",
  club_override: "Ajuste del club",
  auto_promotion: "Ascenso",
  auto_demotion: "Descenso",
  inactivity: "Por inactividad",
};
