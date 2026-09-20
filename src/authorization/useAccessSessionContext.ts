import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  getGrantedPermissions,
  type AccessSessionContext,
} from "./evaluateAccess";

/** Lee permisos efectivos de `/me` (memoria; no se persisten). */
export function useAccessSessionContext(): AccessSessionContext {
  const scopedPermissions = useAuthStore(
    (state) => state.user?.scopedPermissions,
  );
  const isRootPlatformAdmin = useAuthStore(
    (state) => Boolean(state.user?.isRootPlatformAdmin),
  );

  return useMemo(
    () => ({
      scopedPermissions: getGrantedPermissions(scopedPermissions),
      isRootPlatformAdmin,
    }),
    [isRootPlatformAdmin, scopedPermissions],
  );
}
