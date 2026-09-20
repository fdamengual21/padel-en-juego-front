import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMockSession } from "@/app/MockSessionProvider";
import { useUser } from "@/app/UserProvider";
import { ROUTES } from "@/router/routes";

/** Rutas que requieren cuenta. Espera el `/me` de arranque para no redirigir al login. */
export default function RequireAuth() {
  const { isAuthenticated } = useMockSession();
  const { isResolvingUser } = useUser();
  const location = useLocation();

  if (isResolvingUser) {
    return null;
  }

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
