import { create } from "zustand";
import { persist } from "zustand/middleware";
import { findUserClub, isClubUuid } from "@/modules/auth/clubContext";
import { useClubSessionStore } from "@/stores/clubSessionStore";
import type { UserMeDto } from "@/modules/users";

export const AUTH_STORE_KEY = "padel-en-juego.auth";

interface SetAuthPayload {
  token: string;
  refreshToken: string;
  expiresAt: string;
}

interface AuthPersisted {
  token: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  selectedClubId: string | null;
  isClubMode: boolean;
}

interface AuthStore extends AuthPersisted {
  user: UserMeDto | null;
  setAuthSession: (payload: SetAuthPayload) => void;
  setUserProfile: (user: UserMeDto) => void;
  enterClub: (clubId: string) => void;
  exitClubMode: () => void;
  clearSelectedClub: () => void;
  clearAuth: () => void;
}

const emptySession: AuthPersisted & { user: UserMeDto | null } = {
  user: null,
  token: null,
  refreshToken: null,
  expiresAt: null,
  selectedClubId: null,
  isClubMode: false,
};

function readPersistedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...emptySession,

      setAuthSession: ({ token, refreshToken, expiresAt }) => {
        set({
          token: token.trim(),
          refreshToken: refreshToken.trim(),
          expiresAt: String(expiresAt).trim(),
          user: null,
          selectedClubId: null,
          isClubMode: false,
        });
        useClubSessionStore.getState().clear();
      },

      setUserProfile: (user) => {
        set({ user });
      },

      enterClub: (clubId) => {
        if (!findUserClub(get().user?.clubs, clubId)) return;
        set({ selectedClubId: clubId.trim(), isClubMode: true });
      },

      exitClubMode: () => {
        set({ isClubMode: false });
        useClubSessionStore.getState().clear();
      },

      clearSelectedClub: () => {
        set({ selectedClubId: null, isClubMode: false });
        useClubSessionStore.getState().clear();
      },

      clearAuth: () => {
        set({ ...emptySession });
        useClubSessionStore.getState().clear();
      },
    }),
    {
      name: AUTH_STORE_KEY,
      version: 2,
      partialize: (state): AuthPersisted => ({
        token: state.token,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        selectedClubId: state.selectedClubId,
        isClubMode: state.isClubMode,
      }),
      migrate: (persisted): AuthPersisted => {
        const raw = (persisted ?? {}) as Record<string, unknown>;
        const selectedClubId = readPersistedString(raw.selectedClubId);
        return {
          token: readPersistedString(raw.token),
          refreshToken: readPersistedString(raw.refreshToken),
          expiresAt: readPersistedString(raw.expiresAt),
          selectedClubId: isClubUuid(selectedClubId) ? selectedClubId : null,
          isClubMode: raw.isClubMode === true && isClubUuid(selectedClubId),
        };
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AuthPersisted>;
        const selectedClubId = isClubUuid(persisted.selectedClubId)
          ? persisted.selectedClubId
          : null;
        return {
          ...currentState,
          token: persisted.token ?? null,
          refreshToken: persisted.refreshToken ?? null,
          expiresAt: persisted.expiresAt ?? null,
          selectedClubId,
          isClubMode: persisted.isClubMode === true && Boolean(selectedClubId),
          user: null,
        };
      },
    },
  ),
);
