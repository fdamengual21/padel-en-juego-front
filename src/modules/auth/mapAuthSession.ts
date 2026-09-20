import type { AuthSession, Player, PlayerDashboard, PublicUser } from "@/domain";
import { parseCategoryLevel } from "@/domain";
import type { UserMeDto } from "@/modules/users";

export function displayNameFromMe(user: UserMeDto): string {
  const full = `${user.firstName} ${user.lastName}`.trim();
  return full || user.email;
}

export function toPublicUser(user: UserMeDto): PublicUser {
  return {
    id: user.id,
    name: displayNameFromMe(user),
    email: user.email,
    phone: user.phone,
    status: "active",
    province: null,
    city: null,
    createdAt: new Date().toISOString(),
  };
}

export function toPlayerFromMe(user: UserMeDto): Player {
  const name = displayNameFromMe(user);
  return {
    id: user.playerId ?? user.id,
    userId: user.id,
    displayName: name,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    age: user.age,
    categoryLevel: parseCategoryLevel(user.categoryLevel) ?? 6,
    categoryHistory: [],
    sidePreferencePrimary: null,
    sidePreferenceSecondary: null,
    avatarUrl: user.avatarUrl,
    coverUrl: user.coverUrl,
    createdAt: new Date().toISOString(),
  };
}

/** Adapta el perfil de `/me` a la sesión que consume el resto de la UI. */
export function toAuthSessionFromMe(user: UserMeDto): AuthSession {
  return {
    user: toPublicUser(user),
    player: toPlayerFromMe(user),
  };
}

/** Dashboard vacío para jugadores de API (torneos aún no cableados). */
export function emptyPlayerDashboard(player: Player): PlayerDashboard {
  return {
    player,
    city: null,
    province: null,
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    tournamentsCount: 0,
    tournamentsWon: 0,
    tournamentsLost: 0,
    nextMatch: null,
    recentMatches: [],
    tournaments: [],
  };
}
