import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMockSession } from "@/app/MockSessionProvider";
import { useAuthSessionGate } from "@/router/guards/useAuthSessionGate";
import { ROUTES } from "@/router/routes";

function loginNext(pathname: string, search: string): string {
  const next = `${pathname}${search}`;
  return `${ROUTES.auth.login}?next=${encodeURIComponent(next)}`;
}

/** Rutas que requieren cuenta. Refresca el access vencido antes de denegar. */
export default function RequireAuth() {
  const { isAuthenticated } = useMockSession();
  const { isChecking } = useAuthSessionGate();
  const location = useLocation();

  if (isChecking) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Navigate to={loginNext(location.pathname, location.search)} replace />
    );
  }

  return <Outlet />;
}
