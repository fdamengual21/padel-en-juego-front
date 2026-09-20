import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthSession, PublicUser, Player } from "@/domain";
import { toAuthSessionFromMe } from "@/modules/auth/mapAuthSession";
import { userHasAssociatedClub } from "@/modules/auth/postAuthRedirect";
import type { UserClubContext } from "@/modules/users";
import { useUser } from "@/app/UserProvider";
import { AUTH_STORE_KEY, useAuthStore } from "@/stores/authStore";

export const MOCK_SESSION_KEY = "padel-en-juego.mock-session";

interface PersistedSession {
  userId: string | null;
  playerId: string | null;
  user: PublicUser | null;
  player: Player | null;
}

interface MockSessionValue {
  clubId: string;
  /** Null = visitante (guest). */
  playerId: string | null;
  userId: string | null;
  user: PublicUser | null;
  player: Player | null;
  isAuthenticated: boolean;
  /** True si la sesión vino de la API (JWT), no del mock. */
  hasApiSession: boolean;
  /** Membresías de club que devolvió `/me`. */
  clubs: UserClubContext[];
  selectedClubId: string | null;
  isClubMode: boolean;
  activeClubId: string | null;
  hasAssociatedClub: boolean;
  enterClub: (clubId: string) => void;
  exitClubMode: () => void;
  loginSession: (session: AuthSession) => void;
  logout: () => void;
  /** Entra a la vista jugador sin cuenta. */
  enterAsGuest: () => void;
}

const emptyAuth: PersistedSession = {
  userId: null,
  playerId: null,
  user: null,
  player: null,
};

const MockSessionContext = createContext<MockSessionValue | null>(null);

function loadPersisted(): PersistedSession {
  try {
    const raw = localStorage.getItem(MOCK_SESSION_KEY);
    if (!raw) return { ...emptyAuth };
    const parsed = JSON.parse(raw) as PersistedSession;
    return {
      userId: parsed.userId ?? null,
      playerId: parsed.playerId ?? null,
      user: parsed.user ?? null,
      player: parsed.player ?? null,
    };
  } catch {
    return { ...emptyAuth };
  }
}

function persistMock(state: PersistedSession) {
  localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(state));
}

function wipeLocalSession() {
  localStorage.removeItem(MOCK_SESSION_KEY);
  localStorage.removeItem(AUTH_STORE_KEY);
}

export function MockSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { resolveCurrentUser } = useUser();
  const [state, setState] = useState<PersistedSession>(() => loadPersisted());
  const apiUser = useAuthStore((store) => store.user);
  const apiToken = useAuthStore((store) => store.token);
  const selectedClubId = useAuthStore((store) => store.selectedClubId);
  const isClubMode = useAuthStore((store) => store.isClubMode);
  const clearAuth = useAuthStore((store) => store.clearAuth);
  const enterClubInStore = useAuthStore((store) => store.enterClub);
  const exitClubModeInStore = useAuthStore((store) => store.exitClubMode);
  const apiSession = apiUser ? toAuthSessionFromMe(apiUser) : null;

  const enterClub = useCallback(
    (clubId: string) => {
      enterClubInStore(clubId);
      void resolveCurrentUser();
    },
    [enterClubInStore, resolveCurrentUser],
  );

  const exitClubMode = useCallback(() => {
    const wasClubMode = useAuthStore.getState().isClubMode;
    exitClubModeInStore();
    if (wasClubMode) {
      void resolveCurrentUser();
    }
  }, [exitClubModeInStore, resolveCurrentUser]);

  const loginSession = useCallback((session: AuthSession) => {
    setState(() => {
      const next: PersistedSession = {
        userId: session.user.id,
        playerId: session.player.id,
        user: session.user,
        player: session.player,
      };
      persistMock(next);
      return next;
    });
  }, []);

  const wipeSession = useCallback(() => {
    queryClient.clear();
    clearAuth();
    void useAuthStore.persist.clearStorage();
    wipeLocalSession();
    setState({ ...emptyAuth });
  }, [clearAuth, queryClient]);

  const logout = useCallback(() => {
    wipeSession();
  }, [wipeSession]);

  const enterAsGuest = useCallback(() => {
    wipeSession();
  }, [wipeSession]);

  const value = useMemo<MockSessionValue>(() => {
    const user = apiSession?.user ?? state.user;
    const player = apiSession?.player ?? state.player;
    const clubs = apiUser?.clubs ?? [];
    const hasApiSession = Boolean(apiToken);

    return {
      clubId: isClubMode ? (selectedClubId ?? "") : "",
      playerId: player?.id ?? state.playerId,
      userId: user?.id ?? state.userId,
      user,
      player,
      isAuthenticated: hasApiSession || Boolean(state.userId && state.playerId),
      hasApiSession,
      clubs,
      selectedClubId,
      isClubMode,
      activeClubId: apiUser?.activeClubId ?? null,
      hasAssociatedClub: userHasAssociatedClub({
        clubs,
        activeClubId: apiUser?.activeClubId ?? null,
      }),
      enterClub,
      exitClubMode,
      loginSession,
      logout,
      enterAsGuest,
    };
  }, [
    apiSession,
    apiToken,
    apiUser,
    enterClub,
    enterAsGuest,
    exitClubMode,
    isClubMode,
    loginSession,
    logout,
    selectedClubId,
    state,
  ]);

  return (
    <MockSessionContext.Provider value={value}>
      {children}
    </MockSessionContext.Provider>
  );
}

export function useMockSession() {
  const ctx = useContext(MockSessionContext);
  if (!ctx) {
    throw new Error("useMockSession debe usarse dentro de MockSessionProvider");
  }
  return ctx;
}
