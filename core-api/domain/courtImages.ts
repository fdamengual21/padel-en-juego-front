/**
 * Catálogo de imágenes de cancha servidas desde `public/` (simula URLs de API/CDN).
 * El engine asigna una al azar al listar canchas.
 */
export const COURT_IMAGE_PATHS = [
  "/assets/courts/padel-court-01.jpg",
  "/assets/courts/padel-court-02.jpg",
] as const;

export type CourtImagePath = (typeof COURT_IMAGE_PATHS)[number];

export function pickRandomCourtImagePath(
  random: () => number = Math.random,
): CourtImagePath {
  const index = Math.floor(random() * COURT_IMAGE_PATHS.length);
  return COURT_IMAGE_PATHS[index] ?? COURT_IMAGE_PATHS[0];
}
