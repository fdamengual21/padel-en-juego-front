import { hasAccess } from "@/authorization";
import {
  PERMISSION_CLUB_CLIENTS_READ,
  PERMISSION_CLUB_COURTS_READ,
  PERMISSION_CLUB_RESERVATIONS_READ,
  PERMISSION_CLUB_SETTINGS_READ,
  PERMISSION_CLUB_TOURNAMENTS_READ,
  PERMISSION_CLUB_USERS_READ,
} from "@/authorization";
import { ROUTES } from "./routes";

/** Primera pantalla del club según lo que el staff puede ver. */
export function clubHome(can: (permission: string) => boolean): string {
  if (can(PERMISSION_CLUB_RESERVATIONS_READ) || can(PERMISSION_CLUB_TOURNAMENTS_READ)) {
    return ROUTES.club.dashboard;
  }
  if (can(PERMISSION_CLUB_CLIENTS_READ)) return ROUTES.club.clients;
  if (can(PERMISSION_CLUB_USERS_READ)) return ROUTES.club.staff;
  if (can(PERMISSION_CLUB_COURTS_READ)) return ROUTES.club.courts;
  if (can(PERMISSION_CLUB_SETTINGS_READ)) return ROUTES.club.settings;
  return ROUTES.chooseMode;
}

export function clubHomeFor(permissions: readonly string[] | null | undefined): string {
  return clubHome((permission) => hasAccess(permissions ?? [], permission));
}
