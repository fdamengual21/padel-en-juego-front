import type { UserClubContext } from "@/modules/users";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ClubHeaderSource {
  isClubMode: boolean;
  selectedClubId: string | null;
  user: { clubs: UserClubContext[] } | null;
}

export function isClubUuid(value: string | null | undefined): value is string {
  const id = value?.trim() ?? "";
  return UUID_RE.test(id);
}

export function findUserClub(
  clubs: UserClubContext[] | undefined,
  clubId: string | null | undefined,
): UserClubContext | null {
  const id = clubId?.trim() ?? "";
  if (!isClubUuid(id) || !clubs?.length) return null;
  return clubs.find((club) => club.id === id) ?? null;
}

/** Header `X-Club-Id` solo si el usuario eligió un club y es staff de ese predio. */
export function resolveClubHeaderId(state: ClubHeaderSource): string | null {
  if (!state.isClubMode) return null;
  return findUserClub(state.user?.clubs, state.selectedClubId)?.id ?? null;
}

export function clubRoleLabel(role: string): string {
  switch (role) {
    case "ClubOwner":
      return "Dueño";
    case "ClubAdmin":
      return "Administrador";
    case "Organizer":
      return "Organizador";
    case "Coach":
      return "Profesor";
    default:
      return "Staff";
  }
}
