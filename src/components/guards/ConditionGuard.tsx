import type { ReactNode } from "react";

export interface ConditionGuardProps {
  /** Si es true, se renderiza `children`; si no, `fallback` (por defecto nada). */
  condition: boolean;
  children: ReactNode;
  /** Contenido cuando `condition` es false. */
  fallback?: ReactNode;
}

/**
 * Renderiza `children` solo cuando `condition` es true.
 * Útil para flags de UI, secciones condicionales, etc.
 */
export default function ConditionGuard({
  condition,
  children,
  fallback = null,
}: ConditionGuardProps) {
  if (!condition) {
    return fallback;
  }

  return children;
}
