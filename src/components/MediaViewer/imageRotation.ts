/** Degrees allowed for view-only clockwise image rotation. */
export type ImageRotationDeg = 0 | 90 | 180 | 270;

/**
 * Advances view-only rotation by 90° clockwise and wraps at 360°.
 * Non-finite or unexpected values fall back to the next step from 0.
 */
export function nextClockwiseImageRotationDeg(
  currentDeg: number,
): ImageRotationDeg {
  const normalized = ((Math.round(currentDeg / 90) * 90) % 360 + 360) % 360;
  const next = (normalized + 90) % 360;
  if (next === 0 || next === 90 || next === 180 || next === 270) {
    return next;
  }
  return 90;
}
