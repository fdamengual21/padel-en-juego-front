import { Navigate, Outlet } from "react-router-dom";
import {
  isFeatureEnabled,
  type FeatureKey,
} from "@/config/features";
import { ROUTES } from "@/router/routes";

export interface RequireFeatureProps {
  feature: FeatureKey;
  /** Destino si el feature está off. */
  redirectTo?: string;
}

/**
 * Guard de ruta: exige un feature flag activo o redirige.
 * Uso: envolver un grupo de `<Route>` con `element={<RequireFeature feature="ranking" />}`.
 */
export default function RequireFeature({
  feature,
  redirectTo = ROUTES.home,
}: RequireFeatureProps) {
  if (!isFeatureEnabled(feature)) {
    return <Navigate to={redirectTo} replace />;
  }
  return <Outlet />;
}
