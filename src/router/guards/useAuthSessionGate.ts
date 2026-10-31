import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/app/UserProvider";
import {
  clearStoredAuthSession,
  ensureFreshAccessToken,
} from "@/config/sessionTokenRefresh";
import { useAuthStore } from "@/stores/authStore";

/**
 * Espera el bootstrap de `/me` y, si el access venció, intenta refresh
 * (mismo criterio que Suite `RequireAuth`) antes de dejar pasar o denegar.
 * Si el refresh falla, limpia la sesión: el jugador queda guest.
 */
export function useAuthSessionGate(): { isChecking: boolean } {
  const queryClient = useQueryClient();
  const { isResolvingUser } = useUser();
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const [gate, setGate] = useState<"checking" | "ready">("checking");

  useEffect(() => {
    let cancelled = false;

    async function resolveGate() {
      if (isResolvingUser) {
        if (!cancelled) setGate("checking");
        return;
      }

      try {
        await ensureFreshAccessToken();
      } catch {
        queryClient.clear();
        clearStoredAuthSession();
      }

      if (!cancelled) setGate("ready");
    }

    void resolveGate();
    return () => {
      cancelled = true;
    };
  }, [expiresAt, isResolvingUser, queryClient, refreshToken, token]);

  return { isChecking: isResolvingUser || gate === "checking" };
}
