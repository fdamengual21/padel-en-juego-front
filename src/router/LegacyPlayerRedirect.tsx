import { Navigate, useLocation, useParams } from "react-router-dom";
import { ROUTES } from "@/router/routes";

/** Compat: `/player` y `/player/...` → rutas jugador en la raíz. */
export default function LegacyPlayerRedirect() {
  const { "*": rest } = useParams();
  const { search } = useLocation();
  const to = rest ? `/${rest}` : ROUTES.home;
  return <Navigate to={`${to}${search}`} replace />;
}
