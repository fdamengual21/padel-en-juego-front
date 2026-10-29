import { create } from "zustand";
import Api from "@/api/Api";
import type { Municipality, Province } from "@/modules/geography";
import {
  GEOGRAPHY_PROVINCES_ENTRY_KEY,
  municipalitiesEntryKey,
} from "@/stores/geographyCacheContext";

export type GeographyCacheEntryStatus = "idle" | "loading" | "success" | "error";

export interface GeographyCacheEntry<T> {
  items: T[];
  status: GeographyCacheEntryStatus;
  errorMessage: string | null;
}

interface GeographyCacheStoreState {
  entries: Record<string, GeographyCacheEntry<Province | Municipality>>;
}

interface GeographyCacheStoreActions {
  ensureProvinces: () => Promise<Province[]>;
  ensureMunicipalities: (provinceId: number) => Promise<Municipality[]>;
  resetAll: () => void;
  invalidateProvinces: () => void;
  invalidateMunicipalities: (provinceId?: number) => void;
  refreshProvinces: () => Promise<Province[]>;
  refreshMunicipalities: (provinceId: number) => Promise<Municipality[]>;
}

export type GeographyCacheStore = GeographyCacheStoreState & GeographyCacheStoreActions;

const pendingByKey = new Map<string, Promise<Province[] | Municipality[]>>();

export const useGeographyCacheStore = create<GeographyCacheStore>()((set, get) => ({
  entries: {},

  ensureProvinces: async () => {
    const entryKey = GEOGRAPHY_PROVINCES_ENTRY_KEY;
    const existing = get().entries[entryKey] as GeographyCacheEntry<Province> | undefined;
    if (existing?.status === "success") {
      return existing.items;
    }

    const pendingKey = entryKey;
    const existingPromise = pendingByKey.get(pendingKey);
    if (existingPromise) {
      return existingPromise as Promise<Province[]>;
    }

    let settleOk!: (value: Province[]) => void;
    let settleErr!: (reason: unknown) => void;
    const promise = new Promise<Province[]>((resolve, reject) => {
      settleOk = resolve;
      settleErr = reject;
    });

    pendingByKey.set(pendingKey, promise);

    void (async () => {
      try {
        set((state) => ({
          entries: {
            ...state.entries,
            [entryKey]: {
              items:
                (state.entries[entryKey] as GeographyCacheEntry<Province> | undefined)?.items ?? [],
              status: "loading",
              errorMessage: null,
            },
          },
        }));

        const items = await Api.GeographyService().listProvinces();

        set((state) => ({
          entries: {
            ...state.entries,
            [entryKey]: {
              items,
              status: "success",
              errorMessage: null,
            },
          },
        }));

        settleOk(items);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "No se pudieron cargar las provincias.";

        set((state) => ({
          entries: {
            ...state.entries,
            [entryKey]: {
              items:
                (state.entries[entryKey] as GeographyCacheEntry<Province> | undefined)?.items ?? [],
              status: "error",
              errorMessage: message,
            },
          },
        }));

        settleErr(error instanceof Error ? error : new Error(message));
      } finally {
        pendingByKey.delete(pendingKey);
      }
    })();

    return promise;
  },

  ensureMunicipalities: async (provinceId: number) => {
    const entryKey = municipalitiesEntryKey(provinceId);
    const existing = get().entries[entryKey] as GeographyCacheEntry<Municipality> | undefined;
    if (existing?.status === "success") {
      return existing.items;
    }

    const pendingKey = entryKey;
    const existingPromise = pendingByKey.get(pendingKey);
    if (existingPromise) {
      return existingPromise as Promise<Municipality[]>;
    }

    let settleOk!: (value: Municipality[]) => void;
    let settleErr!: (reason: unknown) => void;
    const promise = new Promise<Municipality[]>((resolve, reject) => {
      settleOk = resolve;
      settleErr = reject;
    });

    pendingByKey.set(pendingKey, promise);

    void (async () => {
      try {
        set((state) => ({
          entries: {
            ...state.entries,
            [entryKey]: {
              items:
                (state.entries[entryKey] as GeographyCacheEntry<Municipality> | undefined)?.items ??
                [],
              status: "loading",
              errorMessage: null,
            },
          },
        }));

        const items = await Api.GeographyService().listMunicipalities(provinceId);

        set((state) => ({
          entries: {
            ...state.entries,
            [entryKey]: {
              items,
              status: "success",
              errorMessage: null,
            },
          },
        }));

        settleOk(items);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "No se pudieron cargar los municipios.";

        set((state) => ({
          entries: {
            ...state.entries,
            [entryKey]: {
              items:
                (state.entries[entryKey] as GeographyCacheEntry<Municipality> | undefined)?.items ??
                [],
              status: "error",
              errorMessage: message,
            },
          },
        }));

        settleErr(error instanceof Error ? error : new Error(message));
      } finally {
        pendingByKey.delete(pendingKey);
      }
    })();

    return promise;
  },

  resetAll: () => {
    pendingByKey.clear();
    set({ entries: {} });
  },

  invalidateProvinces: () => {
    set((state) => {
      if (!(GEOGRAPHY_PROVINCES_ENTRY_KEY in state.entries)) {
        return state;
      }
      const nextEntries = { ...state.entries };
      delete nextEntries[GEOGRAPHY_PROVINCES_ENTRY_KEY];
      return { entries: nextEntries };
    });
  },

  invalidateMunicipalities: (provinceId?: number) => {
    set((state) => {
      if (provinceId === undefined) {
        const nextEntries = { ...state.entries };
        for (const key of Object.keys(nextEntries)) {
          if (key.startsWith("municipalities:")) {
            delete nextEntries[key];
          }
        }
        return { entries: nextEntries };
      }

      const key = municipalitiesEntryKey(provinceId);
      if (!(key in state.entries)) {
        return state;
      }
      const nextEntries = { ...state.entries };
      delete nextEntries[key];
      return { entries: nextEntries };
    });
  },

  refreshProvinces: async () => {
    get().invalidateProvinces();
    return get().ensureProvinces();
  },

  refreshMunicipalities: async (provinceId: number) => {
    get().invalidateMunicipalities(provinceId);
    return get().ensureMunicipalities(provinceId);
  },
}));
