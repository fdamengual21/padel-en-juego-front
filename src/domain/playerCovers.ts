/**
 * Catálogo de portadas de perfil de jugador servidas desde `public/`
 * (simula URLs de API/CDN). Por ahora reutiliza fotos de cancha de ejemplo.
 */
export const PLAYER_COVER_PATHS = [
  "/assets/courts/padel-court-01.jpg",
  "/assets/courts/padel-court-02.jpg",
] as const;

export type PlayerCoverPath = (typeof PLAYER_COVER_PATHS)[number];

export function isPlayerCoverPath(value: string | null | undefined): value is PlayerCoverPath {
  if (!value) return false;
  return (PLAYER_COVER_PATHS as readonly string[]).includes(value);
}

export function defaultPlayerCoverPath(): PlayerCoverPath {
  return PLAYER_COVER_PATHS[0];
}
