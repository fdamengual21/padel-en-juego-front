export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function groupQualificationTargetLabel(position: number): string {
  if (position <= 1) return "Pasa a cuartos";
  return "Pasa a octavos";
}
