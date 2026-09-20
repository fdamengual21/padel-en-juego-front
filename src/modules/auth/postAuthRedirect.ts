import { ROUTES } from "@/router/routes";
import type { UserSummary } from "./types";

type ClubMembershipUser = Pick<UserSummary, "clubs" | "activeClubId">;

export function userHasAssociatedClub(user: ClubMembershipUser | null | undefined): boolean {
  if (!user) return false;
  if (user.activeClubId) return true;
  return (user.clubs?.length ?? 0) > 0;
}

/** Home del jugador, incluyendo el path legado `/player`. */
export function isPlayerHomePath(path: string | null | undefined): boolean {
  if (path == null) return true;
  const pathname = path.trim().split("?")[0];
  return pathname === "" || pathname === "/" || pathname === "/player";
}

/**
 * Destino tras login / verificación.
 * `next` explícito (inscripción, perfil, etc.) gana; si no, quien tiene club
 * elige modo y el resto va al inicio jugador.
 */
export function resolvePostAuthPath(
  user: ClubMembershipUser | null | undefined,
  next?: string | null,
): string {
  const trimmed = next?.trim() ?? "";
  if (trimmed && !isPlayerHomePath(trimmed)) return trimmed;
  return userHasAssociatedClub(user) ? ROUTES.chooseMode : ROUTES.home;
}
