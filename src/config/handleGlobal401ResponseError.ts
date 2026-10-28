import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  isAccessTokenExpired,
  refreshAuthSession,
} from "./sessionTokenRefresh";
import { useAuthStore } from "@/stores/authStore";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const ANONYMOUS_AUTH_PATHS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/register",
  "/auth/confirm-email",
  "/auth/resend-confirmation",
  "/auth/logout",
  "/auth/accept-invite",
  "/auth/password/forgot",
  "/auth/password/reset",
] as const;

function endsWithAuthPath(url: string, suffix: string): boolean {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      return new URL(url).pathname.endsWith(suffix);
    } catch {
      return false;
    }
  }
  return url.endsWith(suffix);
}

/** Login, registro y demás rutas anónimas: sin Bearer ni refresh global de 401. */
export function isAnonymousAuthPath(url: unknown): boolean {
  if (typeof url !== "string" || url.trim() === "") {
    return false;
  }
  return ANONYMOUS_AUTH_PATHS.some((path) => endsWithAuthPath(url, path));
}

function clearStoredSession(): void {
  const { clearAuth } = useAuthStore.getState();
  clearAuth();
  void useAuthStore.persist.clearStorage();
}

/**
 * Maneja 401 globales: intenta refresh (single-flight) si el access venció y
 * hay refresh token, reintenta el request original una vez. Si falla, limpia
 * la sesión. No redirige al login: la vista jugador sigue usable como guest
 * y `RequireAuth` manda al ingreso solo las rutas protegidas.
 */
export async function handleGlobal401ResponseError(
  error: AxiosError,
  retryRequest: (config: InternalAxiosRequestConfig) => Promise<unknown>,
): Promise<unknown> {
  const requestUrl = error.config?.url;
  if (
    error.response?.status !== 401 ||
    isAnonymousAuthPath(requestUrl) ||
    !error.config
  ) {
    return Promise.reject(error);
  }

  const originalConfig = error.config as RetriableRequestConfig;
  if (originalConfig._retry) {
    clearStoredSession();
    return Promise.reject(error);
  }

  const { token, refreshToken, expiresAt } = useAuthStore.getState();
  const canAttemptRefresh = Boolean(refreshToken?.trim());
  const accessExpired = isAccessTokenExpired(token, expiresAt);

  // 401 con access aún vigente: no rotar refresh (permiso o recurso).
  if (!accessExpired && token?.trim()) {
    return Promise.reject(error);
  }

  if (!canAttemptRefresh) {
    if (token?.trim()) {
      clearStoredSession();
    }
    return Promise.reject(error);
  }

  let session;
  try {
    session = await refreshAuthSession();
  } catch {
    clearStoredSession();
    return Promise.reject(error);
  }

  originalConfig._retry = true;
  originalConfig.headers = originalConfig.headers ?? {};
  originalConfig.headers.Authorization = `Bearer ${session.token}`;
  return retryRequest(originalConfig);
}
