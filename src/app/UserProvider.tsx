import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import Api from "@/api/Api";
import {
  isAccessTokenExpired,
  refreshAuthSession,
} from "@/config/sessionTokenRefresh";
import { ApiHttpError } from "@/lib/apiClient";
import type { ConfirmEmailInput, LoginInput } from "@/modules/auth";
import {
  findUserClub,
  resolveClubHeaderId,
} from "@/modules/auth/clubContext";
import type { UserMeDto } from "@/modules/users";
import { useAuthStore } from "@/stores/authStore";

interface UserContextValue {
  isResolvingUser: boolean;
  loginAndResolveUser: (payload: LoginInput) => Promise<UserMeDto>;
  confirmEmailAndResolveUser: (payload: ConfirmEmailInput) => Promise<UserMeDto>;
  resolveCurrentUser: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

function syncSelectedClub(me: UserMeDto) {
  const { selectedClubId, clearSelectedClub } = useAuthStore.getState();
  if (selectedClubId && !findUserClub(me.clubs, selectedClubId)) {
    clearSelectedClub();
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const setAuthSession = useAuthStore((state) => state.setAuthSession);
  const setUserProfile = useAuthStore((state) => state.setUserProfile);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [isResolvingUser, setIsResolvingUser] = useState(true);
  const resolvingRef = useRef(false);

  const resolveCurrentUser = useCallback(async () => {
    if (!useAuthStore.getState().token?.trim()) return;
    if (resolvingRef.current) return;

    resolvingRef.current = true;
    setIsResolvingUser(true);
    try {
      const hadClubHeader = Boolean(resolveClubHeaderId(useAuthStore.getState()));
      const me = await Api.UserService().me();
      syncSelectedClub(me);
      setUserProfile(me);

      if (hadClubHeader || !resolveClubHeaderId(useAuthStore.getState())) {
        return;
      }

      try {
        const scoped = await Api.UserService().me();
        syncSelectedClub(scoped);
        setUserProfile(scoped);
      } catch (err) {
        if (err instanceof ApiHttpError && (err.status === 403 || err.status === 400)) {
          useAuthStore.getState().clearSelectedClub();
          return;
        }
        throw err;
      }
    } catch (err) {
      if (err instanceof ApiHttpError && err.status === 401) {
        queryClient.clear();
        clearAuth();
        void useAuthStore.persist.clearStorage();
        return;
      }
      if (!useAuthStore.getState().user) {
        throw err;
      }
    } finally {
      setIsResolvingUser(false);
      resolvingRef.current = false;
    }
  }, [clearAuth, queryClient, setUserProfile]);

  const applyLoginTokens = useCallback(
    async (login: {
      token: string;
      refreshToken: string;
      expiresAt: string;
    }) => {
      queryClient.clear();
      setAuthSession({
        token: login.token,
        refreshToken: login.refreshToken,
        expiresAt: login.expiresAt,
      });
      try {
        const me = await Api.UserService().me();
        setUserProfile(me);
        return me;
      } catch (err) {
        queryClient.clear();
        clearAuth();
        void useAuthStore.persist.clearStorage();
        throw err;
      }
    },
    [clearAuth, queryClient, setAuthSession, setUserProfile],
  );

  const loginAndResolveUser = useCallback(
    async (payload: LoginInput) => {
      const login = await Api.AuthService().login(payload);
      return applyLoginTokens(login);
    },
    [applyLoginTokens],
  );

  const confirmEmailAndResolveUser = useCallback(
    async (payload: ConfirmEmailInput) => {
      const login = await Api.AuthService().confirmEmail(payload);
      return applyLoginTokens(login);
    },
    [applyLoginTokens],
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { token, refreshToken, expiresAt } = useAuthStore.getState();
      if (
        refreshToken?.trim() &&
        isAccessTokenExpired(token, expiresAt)
      ) {
        try {
          await refreshAuthSession();
        } catch {
          if (cancelled) return;
          queryClient.clear();
          clearAuth();
          void useAuthStore.persist.clearStorage();
          setIsResolvingUser(false);
          return;
        }
      }

      if (cancelled) return;
      if (!useAuthStore.getState().token?.trim()) {
        setIsResolvingUser(false);
        return;
      }
      void resolveCurrentUser();
    };

    if (useAuthStore.persist.hasHydrated()) {
      void run();
    } else {
      const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
        void run();
      });
      return () => {
        cancelled = true;
        unsubscribe();
      };
    }

    return () => {
      cancelled = true;
    };
  }, [clearAuth, queryClient, resolveCurrentUser]);

  const value = useMemo<UserContextValue>(
    () => ({
      isResolvingUser,
      loginAndResolveUser,
      confirmEmailAndResolveUser,
      resolveCurrentUser,
    }),
    [
      isResolvingUser,
      loginAndResolveUser,
      confirmEmailAndResolveUser,
      resolveCurrentUser,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser debe usarse dentro de UserProvider");
  }
  return ctx;
}
