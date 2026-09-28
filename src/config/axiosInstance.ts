import axios, { type AxiosResponse } from "axios";
import { handleGlobal401ResponseError } from "./handleGlobal401ResponseError";
import {
  ApiHttpError,
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

axiosInstance.interceptors.request.use((config) => {
  const auth = useAuthStore.getState();
  const token = auth.token?.trim();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  const clubId = resolveClubHeaderId(auth);
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
        ),
      );
    }
  },
);

export function readData<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  return response.data?.data as T;
}

export default axiosInstance;
