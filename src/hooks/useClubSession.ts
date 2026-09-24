import { useEffect } from "react";
import Api from "@/api/Api";
import { ApiHttpError } from "@/lib/apiClient";
import type { ClubContext, ClubSettings } from "@/modules/clubs";
import { useAuthStore } from "@/stores/authStore";
import {
  useClubSessionStore,
  type ClubSession,
} from "@/stores/clubSessionStore";

function toSession(context: ClubContext): ClubSession {
  return {
    clubId: context.id,
    name: context.name,
    isActive: context.isActive,
    openTime: context.openTime,
    closeTime: context.closeTime,
    openDays: context.openDays,
  };
}

let inflight: { clubId: string; promise: Promise<void> } | null = null;

export function loadClubSession(clubId: string): Promise<void> {
  const current = useClubSessionStore.getState();
  if (inflight?.clubId === clubId && current.status === "loading") {
    return inflight.promise;
  }

  const requestId = useClubSessionStore.getState().beginLoad(clubId);
  const promise = Api.ClubService()
    .getContext()
    .then((context) => {
      useClubSessionStore.getState().fulfill(requestId, toSession(context));
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "No se pudo cargar el club";
      const status = err instanceof ApiHttpError ? err.status : null;
      useClubSessionStore.getState().fail(requestId, { message, status });
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });

  inflight = { clubId, promise };
  return promise;
}

export function syncClubSessionFromSettings(settings: ClubSettings) {
  useClubSessionStore.getState().patch({
    clubId: settings.id,
    name: settings.name,
    isActive: settings.isActive,
    openTime: settings.openTime,
    closeTime: settings.closeTime,
    openDays: settings.openDays,
  });
}

export function useClubSession() {
  const session = useClubSessionStore((state) => state.session);
  const status = useClubSessionStore((state) => state.status);
  const error = useClubSessionStore((state) => state.error);

  return {
    session,
    isLoading: status === "loading",
    isReady: status === "ready",
    error,
  };
}

export function useLoadClubSession() {
  const isClubMode = useAuthStore((state) => state.isClubMode);
  const clubId = useAuthStore((state) => state.selectedClubId);
  const clubSession = useClubSession();

  useEffect(() => {
    if (!isClubMode || !clubId) return;
    void loadClubSession(clubId);
  }, [isClubMode, clubId]);

  return clubSession;
}
