import axios, { type AxiosResponse } from "axios";
import {
  handleGlobal401ResponseError,
  isAnonymousAuthPath,
} from "./handleGlobal401ResponseError";
import {
  clearStoredAuthSession,
  ensureFreshAccessToken,
} from "./sessionTokenRefresh";
import {
  ApiHttpError,
  fieldErrorsFromEnvelope,
  messageFromEnvelope,
  type ApiEnvelope,
} from "@/lib/apiClient";
import { resolveClubHeaderId } from "@/modules/auth/clubContext";
import { useAuthStore } from "@/stores/authStore";

const origin = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const axiosInstance = axios.create({
  baseURL: `${origin}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(async (config) => {
  if (isAnonymousAuthPath(config.url)) {
    delete config.headers.Authorization;
    delete config.headers["X-Club-Id"];
    return config;
  }

  let accessToken: string | null = null;
  try {
    accessToken = await ensureFreshAccessToken();
  } catch {
    clearStoredAuthSession();
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else {
    delete config.headers.Authorization;
  }

  const clubId = resolveClubHeaderId(useAuthStore.getState());
  if (clubId) {
    config.headers["X-Club-Id"] = clubId;
  } else {
    delete config.headers["X-Club-Id"];
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    const body = response.data as ApiEnvelope<unknown> | undefined;
    if (body?.success === false) {
      throw new ApiHttpError(
        messageFromEnvelope(body, "No se pudo completar la operación"),
        response.status,
        fieldErrorsFromEnvelope(body),
      );
    }
    return response;
  },
  async (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    try {
      return await handleGlobal401ResponseError(error, (config) =>
        axiosInstance.request(config),
      );
    } catch (handled) {
      if (handled instanceof ApiHttpError) {
        return Promise.reject(handled);
      }
      if (!axios.isAxiosError(handled)) {
        return Promise.reject(handled);
      }
      const status = handled.response?.status ?? 0;
      const body = (handled.response?.data ?? null) as ApiEnvelope<unknown> | null;
      return Promise.reject(
        new ApiHttpError(
          messageFromEnvelope(body, "No se pudo completar la operación"),
          status,
          fieldErrorsFromEnvelope(body),
        ),
      );
    }
  },
);

export function readData<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  return response.data?.data as T;
}

export default axiosInstance;
