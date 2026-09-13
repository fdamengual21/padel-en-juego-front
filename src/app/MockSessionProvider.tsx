import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthSession, PublicUser, Player } from "@core-api";

const SESSION_KEY = "startpadel.auth-session.v1";

interface PersistedSession {
  clubId: string;
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
  setClubId: (id: string) => void;
  loginSession: (session: AuthSession) => void;
  logout: () => void;
  /** Entra a la vista jugador sin cuenta. */
  enterAsGuest: () => void;
}

const MockSessionContext = createContext<MockSessionValue | null>(null);

function loadPersisted(): PersistedSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return {
        clubId: "club-1",
        userId: null,
        playerId: null,
        user: null,
        player: null,
      };
    }
    const parsed = JSON.parse(raw) as PersistedSession;
    return {
      clubId: parsed.clubId || "club-1",
      userId: parsed.userId ?? null,
      playerId: parsed.playerId ?? null,
      user: parsed.user ?? null,
      player: parsed.player ?? null,
    };
  } catch {
    return {
      clubId: "club-1",
      userId: null,
      playerId: null,
      user: null,
      player: null,
    };
  }
}

function persist(state: PersistedSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

export function MockSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedSession>(() => loadPersisted());

  const setClubId = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, clubId: id };
      persist(next);
      return next;
    });
  }, []);

  const loginSession = useCallback((session: AuthSession) => {
    setState((prev) => {
      const next: PersistedSession = {
        ...prev,
        userId: session.user.id,
        playerId: session.player.id,
        user: session.user,
        player: session.player,
      };
      persist(next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    setState((prev) => {
      const next: PersistedSession = {
        ...prev,
        userId: null,
        playerId: null,
        user: null,
        player: null,
      };
      persist(next);
      return next;
    });
  }, []);

  const enterAsGuest = useCallback(() => {
    setState((prev) => {
      const next: PersistedSession = {
        ...prev,
        userId: null,
        playerId: null,
        user: null,
        player: null,
      };
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo<MockSessionValue>(
    () => ({
      clubId: state.clubId,
      playerId: state.playerId,
      userId: state.userId,
      user: state.user,
      player: state.player,
      isAuthenticated: Boolean(state.userId && state.playerId),
      setClubId,
      loginSession,
      logout,
      enterAsGuest,
    }),
    [state, setClubId, loginSession, logout, enterAsGuest],
  );

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
