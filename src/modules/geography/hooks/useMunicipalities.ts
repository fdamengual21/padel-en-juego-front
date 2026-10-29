import { useCallback, useEffect } from "react";
import type { Municipality } from "../types";
import { municipalitiesEntryKey } from "@/stores/geographyCacheContext";
import { useGeographyCacheStore } from "@/stores/geographyCacheStore";

export interface UseMunicipalitiesResult {
  municipalities: Municipality[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMunicipalities(provinceId: number | null): UseMunicipalitiesResult {
  const entryKey = provinceId !== null ? municipalitiesEntryKey(provinceId) : null;
  const entry = useGeographyCacheStore((state) =>
    entryKey ? state.entries[entryKey] : undefined,
  ) as { items: Municipality[]; status: string; errorMessage: string | null } | undefined;
  const ensureMunicipalities = useGeographyCacheStore((state) => state.ensureMunicipalities);
  const invalidateMunicipalities = useGeographyCacheStore(
    (state) => state.invalidateMunicipalities,
  );

  useEffect(() => {
    if (provinceId === null) {
      return;
    }
    void ensureMunicipalities(provinceId).catch(() => {});
  }, [provinceId, ensureMunicipalities]);

  const refetch = useCallback(async () => {
    if (provinceId === null) {
      return;
    }
    invalidateMunicipalities(provinceId);
    await ensureMunicipalities(provinceId);
  }, [provinceId, ensureMunicipalities, invalidateMunicipalities]);

  const isLoading =
    provinceId !== null &&
    (entry === undefined || entry.status === "idle" || entry.status === "loading");

  return {
    municipalities: entry?.items ?? [],
    isLoading,
    error: entry?.status === "error" ? entry.errorMessage : null,
    refetch,
  };
}
