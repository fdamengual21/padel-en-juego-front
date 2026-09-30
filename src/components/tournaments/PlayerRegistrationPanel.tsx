import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import RequirePlayerAuth from "@/components/auth/RequirePlayerAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { PairSidePreference, Tournament, TournamentCategory } from "@/domain";
import { formatTournamentDayEs } from "@/lib/dates";
import { toastError, toastSuccess } from "@/lib/toast";
import { ROUTES } from "@/router/routes";

interface PlayerRegistrationPanelProps {
  tournament: Tournament;
  categories: TournamentCategory[];
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
}

function daysBetween(start: string, end: string | null): string[] {
  const days: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end || start}T12:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return [start];
  while (cursor <= last) {
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    days.push(`${cursor.getFullYear()}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function sideFromPlayer(value: string | null | undefined): PairSidePreference {
  if (value === "left") return "reves";
  if (value === "right") return "drive";
  return "any";
}

function statusCopy(
  status: string,
  partnerName: string | null,
): string {
  if (status === "PENDING") return "Tu inscripción quedó pendiente hasta que el club la acepte.";
  if (status === "ACCEPTED" && partnerName) return `Estás inscripto con ${partnerName}.`;
  if (status === "ACCEPTED") return "Estás inscripto. El club todavía no te asignó pareja.";
  if (status === "DISQUALIFIED") return "El club te desclasificó de esta categoría.";
  if (status === "WAITLIST") return "Estás en lista de espera.";
  return "El club no aceptó esta inscripción. Podés volver a anotarte.";
}

export default function PlayerRegistrationPanel({
  tournament,
  categories,
  categoryId,
  onCategoryChange,
}: PlayerRegistrationPanelProps) {
  const { isAuthenticated, player } = useMockSession();
  const qc = useQueryClient();
  const quality = tournament.format === "QUALITY";
  const days = useMemo(
    () => (quality ? [] : daysBetween(tournament.startDate, tournament.endDate)),
    [quality, tournament.startDate, tournament.endDate],
  );
  const [side, setSide] = useState<PairSidePreference>(sideFromPlayer(player?.sidePreference));
  const [ranges, setRanges] = useState<Record<string, { start: string; end: string }>>({});

  useEffect(() => {
    setSide(sideFromPlayer(player?.sidePreference));
  }, [player?.sidePreference, categoryId]);

  useEffect(() => {
    const start = tournament.dailyStartTime || "10:00";
    const end = tournament.dailyEndTime || "22:00";
    setRanges(Object.fromEntries(days.map((day) => [day, { start, end }])));
  }, [days, tournament.dailyStartTime, tournament.dailyEndTime, tournament.id]);

  const mine = useQuery({
    queryKey: ["my-registration", categoryId],
    queryFn: () => Api.TournamentOpsService().getMyRegistration(categoryId),
    enabled: isAuthenticated && Boolean(categoryId),
  });

  const register = useMutation({
    mutationFn: () =>
      Api.TournamentOpsService().registerPairByPlayer({
        tournamentCategoryId: categoryId,
        player1Id: player?.id ?? "",
        sidePreference: side,
        availability: quality
          ? []
          : days.map((day) => ({
              date: day,
              startTime: ranges[day]?.start || tournament.dailyStartTime || "10:00",
              endTime: ranges[day]?.end || tournament.dailyEndTime || "22:00",
            })),
      }),
    onSuccess: async () => {
      toastSuccess(
        "Inscripción enviada",
        "Queda pendiente hasta que el club la acepte.",
      );
      await qc.invalidateQueries({ queryKey: ["my-registration", categoryId] });
      await qc.invalidateQueries({ queryKey: ["player-home"] });
    },
    onError: (err: Error) => toastError("No se pudo inscribir", err.message),
  });

  if (!isAuthenticated) {
    return (
      <section
        className="rounded-xl border border-border bg-card p-4"
        data-testid="tournament-subscribe-cta"
      >
        <RequirePlayerAuth
          nextPath={ROUTES.player.tournamentDetail(tournament.id)}
          actionLabel="Inscribirte"
        >
          <span className="sr-only">Inscripción</span>
        </RequirePlayerAuth>
      </section>
    );
  }

  const current = mine.data?.registration;
  const closed = tournament.status !== "registrationOpen";
  const canRegister =
    !current || current.status === "REJECTED" || current.status === "CANCELLED";

  return (
    <section
      className="space-y-3 rounded-xl border border-border bg-card p-4"
      data-testid="tournament-subscribe-cta"
    >
      <h3 className="text-sm font-medium">Inscripción</h3>
      {categories.length > 1 ? (
        <div className="space-y-1">
          <Label htmlFor="player-category">Categoría</Label>
          <select
            id="player-category"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {mine.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando tu inscripción…</p>
      ) : current && !canRegister ? (
        <p className="text-sm text-muted-foreground">
          {statusCopy(current.status, mine.data?.partnerName ?? null)}
        </p>
      ) : closed ? (
        <p className="text-sm text-muted-foreground">Las inscripciones de este torneo están cerradas.</p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            register.mutate();
          }}
        >
          {current ? (
            <p className="text-sm text-muted-foreground">{statusCopy(current.status, null)}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Te anotás solo. Si hay otro jugador con un lado que combine, el club los junta al aceptar.
            </p>
          )}
          <div className="space-y-1">
            <Label htmlFor="player-side">Lado</Label>
            <select
              id="player-side"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={side}
              onChange={(event) => setSide(event.target.value as PairSidePreference)}
            >
              <option value="drive">Drive</option>
              <option value="reves">Revés</option>
              <option value="any">Cualquiera</option>
            </select>
          </div>
          {days.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Disponibilidad por día</p>
              {days.map((day) => (
                <div key={day} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <span className="text-sm">{formatTournamentDayEs(day)}</span>
                  <input
                    aria-label={`Desde ${day}`}
                    type="time"
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    value={ranges[day]?.start ?? ""}
                    onChange={(event) =>
                      setRanges((currentRanges) => ({
                        ...currentRanges,
                        [day]: {
                          start: event.target.value,
                          end: currentRanges[day]?.end ?? tournament.dailyEndTime,
                        },
                      }))
                    }
                  />
                  <input
                    aria-label={`Hasta ${day}`}
                    type="time"
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                    value={ranges[day]?.end ?? ""}
                    onChange={(event) =>
                      setRanges((currentRanges) => ({
                        ...currentRanges,
                        [day]: {
                          start: currentRanges[day]?.start ?? tournament.dailyStartTime,
                          end: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}
          <Button type="submit" size="sm" disabled={register.isPending || !categoryId}>
            Inscribirme
          </Button>
        </form>
      )}
    </section>
  );
}
