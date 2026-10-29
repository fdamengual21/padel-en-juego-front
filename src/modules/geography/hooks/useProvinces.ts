import { useCallback, useEffect } from "react";
import type { Province } from "../types";
import { GEOGRAPHY_PROVINCES_ENTRY_KEY } from "@/stores/geographyCacheContext";
import { useGeographyCacheStore } from "@/stores/geographyCacheStore";

export interface UseProvincesResult {
  provinces: Province[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProvinces(): UseProvincesResult {
  const entry = useGeographyCacheStore(
    (state) => state.entries[GEOGRAPHY_PROVINCES_ENTRY_KEY],
  ) as { items: Province[]; status: string; errorMessage: string | null } | undefined;
  const ensureProvinces = useGeographyCacheStore((state) => state.ensureProvinces);
  const invalidateProvinces = useGeographyCacheStore((state) => state.invalidateProvinces);

  useEffect(() => {
    void ensureProvinces().catch(() => {});
  }, [ensureProvinces]);

  const refetch = useCallback(async () => {
    invalidateProvinces();
    await ensureProvinces();
  }, [ensureProvinces, invalidateProvinces]);

  const isLoading =
    entry === undefined || entry.status === "idle" || entry.status === "loading";

  return {
    provinces: entry?.items ?? [],
    isLoading,
    error: entry?.status === "error" ? entry.errorMessage : null,
    refetch,
  };
}
