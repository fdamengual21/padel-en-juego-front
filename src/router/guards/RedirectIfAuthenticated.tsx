import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { useMockSession } from "@/app/MockSessionProvider";
import { resolvePostAuthPath } from "@/modules/auth";
import { useAuthSessionGate } from "@/router/guards/useAuthSessionGate";

/** Login/registro: si el bootstrap ya dejó sesión, reusa el destino post-auth. */
export default function RedirectIfAuthenticated() {
  const { isChecking } = useAuthSessionGate();
  const { isAuthenticated, clubs, activeClubId } = useMockSession();
  const [searchParams] = useSearchParams();

  if (isChecking) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">Cargando sesión…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to={resolvePostAuthPath(
          { clubs, activeClubId },
          searchParams.get("next"),
        )}
        replace
      />
    );
  }

  return <Outlet />;
}
