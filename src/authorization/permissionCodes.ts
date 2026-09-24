/**
 * Codigos alineados con `PermissionCode` del backend.
 * Fuente de verdad en runtime: `scopedPermissions` de GET `/api/users/me` (con `X-Club-Id` en modo club).
 *
 * Catalogo club (`club.*`):
 * | Codigo | ClubOwner | ClubAdmin | Organizer | Coach |
 * | club.settings.read/update | si | si | no | no |
 * | club.users.* | si | si | no | no |
 * | club.tournaments.read/write | si | si | si | si |
 * | club.courts.read | si | si | si | si |
 * | club.courts.write | si | si | si | no |
 * | club.clients.read/write | si | si | si | si |
 * | club.reservations.read/write | si | si | si | si |
 * | club.lessons.read | si | si | si | si |
 * | club.lessons.write | si | si | no | si |
 *
 * El front no recalcula la matriz por rol: usa la lista que devolvio `/me`.
 */

export const PERMISSION_PLATFORM_USERS_READ = "platform.users.read";
export const PERMISSION_PLATFORM_USERS_CREATE = "platform.users.create";
export const PERMISSION_PLATFORM_USERS_UPDATE = "platform.users.update";
export const PERMISSION_PLATFORM_USERS_DELETE = "platform.users.delete";
export const PERMISSION_PLATFORM_CLUBS_READ = "platform.clubs.read";
export const PERMISSION_PLATFORM_CLUBS_CREATE = "platform.clubs.create";
export const PERMISSION_PLATFORM_CLUBS_UPDATE = "platform.clubs.update";
export const PERMISSION_PLATFORM_GEOGRAPHY_READ = "platform.geography.read";
export const PERMISSION_PLATFORM_GEOGRAPHY_WRITE = "platform.geography.write";

export const PERMISSION_CLUB_USERS_READ = "club.users.read";
export const PERMISSION_CLUB_USERS_INVITE = "club.users.invite";
export const PERMISSION_CLUB_USERS_DEACTIVATE = "club.users.deactivate";
export const PERMISSION_CLUB_USERS_ROLES_ASSIGN = "club.users.roles.assign";
export const PERMISSION_CLUB_SETTINGS_READ = "club.settings.read";
export const PERMISSION_CLUB_SETTINGS_UPDATE = "club.settings.update";
export const PERMISSION_CLUB_TOURNAMENTS_READ = "club.tournaments.read";
export const PERMISSION_CLUB_TOURNAMENTS_WRITE = "club.tournaments.write";
export const PERMISSION_CLUB_COURTS_READ = "club.courts.read";
export const PERMISSION_CLUB_COURTS_WRITE = "club.courts.write";
export const PERMISSION_CLUB_CLIENTS_READ = "club.clients.read";
export const PERMISSION_CLUB_CLIENTS_WRITE = "club.clients.write";
export const PERMISSION_CLUB_RESERVATIONS_READ = "club.reservations.read";
export const PERMISSION_CLUB_RESERVATIONS_WRITE = "club.reservations.write";
export const PERMISSION_CLUB_LESSONS_READ = "club.lessons.read";
export const PERMISSION_CLUB_LESSONS_WRITE = "club.lessons.write";

export const PERMISSION_CODES = {
  platformUsersRead: PERMISSION_PLATFORM_USERS_READ,
  platformUsersCreate: PERMISSION_PLATFORM_USERS_CREATE,
  platformUsersUpdate: PERMISSION_PLATFORM_USERS_UPDATE,
  platformUsersDelete: PERMISSION_PLATFORM_USERS_DELETE,
  platformClubsRead: PERMISSION_PLATFORM_CLUBS_READ,
  platformClubsCreate: PERMISSION_PLATFORM_CLUBS_CREATE,
  platformClubsUpdate: PERMISSION_PLATFORM_CLUBS_UPDATE,
  platformGeographyRead: PERMISSION_PLATFORM_GEOGRAPHY_READ,
  platformGeographyWrite: PERMISSION_PLATFORM_GEOGRAPHY_WRITE,
  clubUsersRead: PERMISSION_CLUB_USERS_READ,
  clubUsersInvite: PERMISSION_CLUB_USERS_INVITE,
  clubUsersDeactivate: PERMISSION_CLUB_USERS_DEACTIVATE,
  clubUsersRolesAssign: PERMISSION_CLUB_USERS_ROLES_ASSIGN,
  clubSettingsRead: PERMISSION_CLUB_SETTINGS_READ,
  clubSettingsUpdate: PERMISSION_CLUB_SETTINGS_UPDATE,
  clubTournamentsRead: PERMISSION_CLUB_TOURNAMENTS_READ,
  clubTournamentsWrite: PERMISSION_CLUB_TOURNAMENTS_WRITE,
  clubCourtsRead: PERMISSION_CLUB_COURTS_READ,
  clubCourtsWrite: PERMISSION_CLUB_COURTS_WRITE,
  clubClientsRead: PERMISSION_CLUB_CLIENTS_READ,
  clubClientsWrite: PERMISSION_CLUB_CLIENTS_WRITE,
  clubReservationsRead: PERMISSION_CLUB_RESERVATIONS_READ,
  clubReservationsWrite: PERMISSION_CLUB_RESERVATIONS_WRITE,
  clubLessonsRead: PERMISSION_CLUB_LESSONS_READ,
  clubLessonsWrite: PERMISSION_CLUB_LESSONS_WRITE,
} as const;

export type PermissionCode =
  (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];
