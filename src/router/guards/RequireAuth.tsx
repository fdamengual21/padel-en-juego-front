import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMockSession } from "@/app/MockSessionProvider";
import { ROUTES } from "@/router/routes";

/** Rutas que requieren cuenta de jugador. */
export default function RequireAuth() {
  const { isAuthenticated } = useMockSession();
  const location = useLocation();

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`${ROUTES.auth.login}?next=${encodeURIComponent(next)}`}
        replace
      />
    );
  }

  return <Outlet />;
}
