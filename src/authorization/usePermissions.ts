import { useCallback } from "react";
import {
  evaluateSessionAccess,
  type HasAccessOptions,
} from "./evaluateAccess";
import { useAccessSessionContext } from "./useAccessSessionContext";

export interface CanPermissionOptions extends HasAccessOptions {
  /**
   * Si true, el root de plataforma pasa sin mirar `scopedPermissions`.
   * En backoffice de club dejar en false (default): el staff se autoriza por membresia.
   */
  treatRootPlatformAdminAsFullAccess?: boolean;
}

/**
 * Hook de permisos al estilo concesionarias: `can(PERMISSION_CLUB_SETTINGS_UPDATE)`.
 * Compara contra `scopedPermissions` de `/me`, no contra el rol en JWT.
 */
export function usePermissions() {
  const session = useAccessSessionContext();

  const can = useCallback(
    (
      permission: string | readonly string[],
      options?: CanPermissionOptions,
    ) =>
      evaluateSessionAccess({
        session,
        permission,
        mode: options?.mode,
        treatRootPlatformAdminAsFullAccess:
          options?.treatRootPlatformAdminAsFullAccess ?? false,
      }),
    [session],
  );

  return {
    scopedPermissions: session.scopedPermissions,
    isRootPlatformAdmin: session.isRootPlatformAdmin,
    can,
  };
}
