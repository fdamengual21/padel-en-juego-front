import axios from "axios";
import type { LoginResponse } from "@/modules/auth";
import type { ApiEnvelope } from "@/lib/apiClient";
import { useAuthStore } from "@/stores/authStore";

let inFlightRefresh: Promise<LoginResponse> | null = null;

function buildAuthRefreshUrl(): string {
  const origin = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  return `${origin}/api/auth/refresh`;
}

function isValidLoginResponse(
  data: LoginResponse | null | undefined,
): data is LoginResponse {
  return Boolean(
    data?.token?.trim() &&
      data.refreshToken?.trim() &&
      data.expiresAt?.trim(),
  );
}

/**
 * Renueva access + refresh token vía `POST /api/auth/refresh` sin pasar por el
 * interceptor de `axiosInstance` (evita bucles 401).
 * Single-flight: llamadas concurrentes comparten la misma Promise.
 * Actualiza el store solo si la API responde con una sesión válida.
 * No borra el club elegido: el login sigue usando `setAuthSession`.
 *
 * @throws Si no hay refresh token en store o la renovación falla.
 */
export async function refreshAuthSession(): Promise<LoginResponse> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = (async () => {
    const refreshToken = useAuthStore.getState().refreshToken?.trim() ?? "";
    if (!refreshToken) {
      throw new Error("No hay refresh token para renovar la sesión.");
    }

    const response = await axios.post<ApiEnvelope<LoginResponse>>(
      buildAuthRefreshUrl(),
      { refreshToken },
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    const session = response.data?.data;
    if (!response.data?.success || !isValidLoginResponse(session)) {
      throw new Error("La respuesta de renovación de sesión es inválida.");
    }

    useAuthStore.getState().rotateAuthTokens({
      token: session.token,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
    });

    return session;
  })().finally(() => {
    inFlightRefresh = null;
  });

  return inFlightRefresh;
}

/**
 * Indica si el access token del store ya no es usable (ausente, inválido o vencido).
 */
export function isAccessTokenExpired(
  token: string | null | undefined,
  expiresAt: string | null | undefined,
): boolean {
  if (!token?.trim() || !expiresAt?.trim()) {
    return true;
  }
  const expirationDate = new Date(expiresAt);
  if (Number.isNaN(expirationDate.getTime())) {
    return true;
  }
  return expirationDate.getTime() <= Date.now();
}
