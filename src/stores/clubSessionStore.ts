import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { WeekdayIso } from "@/domain";

export type ClubSessionStatus = "idle" | "loading" | "ready" | "error";

export interface ClubSession {
  clubId: string;
  name: string;
  isActive: boolean;
  openTime: string | null;
  closeTime: string | null;
  openDays: WeekdayIso[];
}

interface ClubSessionError {
  message: string;
  status: number | null;
}

interface ClubSessionStore {
  session: ClubSession | null;
  status: ClubSessionStatus;
  error: ClubSessionError | null;
  requestId: number;
  beginLoad: (clubId: string) => number;
  fulfill: (requestId: number, session: ClubSession) => void;
  fail: (requestId: number, error: ClubSessionError) => void;
  patch: (session: ClubSession) => void;
  clear: () => void;
}

const empty = {
  session: null as ClubSession | null,
  status: "idle" as ClubSessionStatus,
  error: null as ClubSessionError | null,
};

export const useClubSessionStore = create<ClubSessionStore>()(
  devtools(
    (set, get) => ({
      ...empty,
      requestId: 0,

      beginLoad: (clubId) => {
        const requestId = get().requestId + 1;
        const keep = get().session?.clubId === clubId ? get().session : null;
        set({
          requestId,
          status: "loading",
          error: null,
          session: keep,
        });
        return requestId;
      },

      fulfill: (requestId, session) => {
        if (get().requestId !== requestId) return;
        set({ session, status: "ready", error: null });
      },

      fail: (requestId, error) => {
        if (get().requestId !== requestId) return;
        set({ status: "error", error, session: null });
      },

      patch: (session) => {
        if (get().session && get().session?.clubId !== session.clubId) return;
        set({ session, status: "ready", error: null });
      },

      clear: () => {
        set({
          ...empty,
          requestId: get().requestId + 1,
        });
      },
    }),
    { name: "club-session" },
  ),
);
