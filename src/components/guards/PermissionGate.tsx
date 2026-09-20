import { useMemo, type ReactNode } from "react";
import {
  evaluateSessionAccess,
  useAccessSessionContext,
} from "@/authorization";

export interface PermissionGateProps {
  children: ReactNode;
  /** Permiso unico o lista (enums de `permissionCodes`). */
  permission: string | readonly string[];
  mode?: "all" | "any";
  /**
   * En club dejar false (default). True solo en UI de plataforma.
   */
  treatRootPlatformAdminAsFullAccess?: boolean;
  fallback?: ReactNode;
}

/**
 * Gate de UI (mismo rol que PermissionGate de concesionarias / PermissionsGuard):
 * muestra `children` solo si `/me.scopedPermissions` cumple. No sustituye la API.
 */
export default function PermissionGate({
  children,
  permission,
  mode = "all",
  treatRootPlatformAdminAsFullAccess = false,
  fallback = null,
}: PermissionGateProps) {
  const accessSession = useAccessSessionContext();
  const allowed = useMemo(
    () =>
      evaluateSessionAccess({
        session: accessSession,
        treatRootPlatformAdminAsFullAccess,
        permission,
        mode,
      }),
    [
      accessSession,
      treatRootPlatformAdminAsFullAccess,
      permission,
      mode,
    ],
  );

  if (!allowed) return fallback;
  return children;
}
