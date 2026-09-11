import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface MockSessionValue {
  clubId: string;
  playerId: string;
  setClubId: (id: string) => void;
  setPlayerId: (id: string) => void;
}

const MockSessionContext = createContext<MockSessionValue | null>(null);

export function MockSessionProvider({ children }: { children: ReactNode }) {
  const [clubId, setClubId] = useState("club-1");
  const [playerId, setPlayerId] = useState("player-1");
  const value = useMemo(
    () => ({ clubId, playerId, setClubId, setPlayerId }),
    [clubId, playerId],
  );
  return (
    <MockSessionContext.Provider value={value}>{children}</MockSessionContext.Provider>
  );
}

export function useMockSession() {
  const ctx = useContext(MockSessionContext);
  if (!ctx) throw new Error("useMockSession debe usarse dentro de MockSessionProvider");
  return ctx;
}
