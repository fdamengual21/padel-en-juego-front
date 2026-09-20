import { useMemo } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { evaluateSessionAccess, useAccessSessionContext } from "@/authorization";
import { useUser } from "@/app/UserProvider";
import { ROUTES } from "@/router/routes";

export interface RequirePermissionProps {
  permission: string | readonly string[];
  mode?: "all" | "any";
  treatRootPlatformAdminAsFullAccess?: boolean;
  redirectTo?: string;
}

/**
 * Guard de ruta: Outlet si hay permiso; si no, redirige.
 * Esperar `/me` para no echar al usuario con `scopedPermissions` vacio.
 */
export default function RequirePermission({
  permission,
  mode = "all",
  treatRootPlatformAdminAsFullAccess = false,
  redirectTo = ROUTES.club.dashboard,
}: RequirePermissionProps) {
  const { isResolvingUser } = useUser();
  const accessSession = useAccessSessionContext();
  const allowed = useMemo(
    () =>
      evaluateSessionAccess({
        session: accessSession,
        treatRootPlatformAdminAsFullAccess,
        permission,
        mode,
      }),
    [accessSession, treatRootPlatformAdminAsFullAccess, permission, mode],
  );

  if (isResolvingUser) return null;
  if (!allowed) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}
