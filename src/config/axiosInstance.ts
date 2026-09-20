import axios, { type AxiosResponse } from "axios";
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
  (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }
    const status = error.response?.status ?? 0;
    const body = (error.response?.data ?? null) as ApiEnvelope<unknown> | null;
    return Promise.reject(
      new ApiHttpError(
        messageFromEnvelope(body, "No se pudo completar la operación"),
        status,
      ),
    );
  },
);

export function readData<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  return response.data?.data as T;
}

export default axiosInstance;
