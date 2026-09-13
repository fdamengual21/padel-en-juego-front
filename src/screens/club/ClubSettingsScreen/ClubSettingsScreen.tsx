import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WeekdayIso } from "@core-api";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import ProvinceCityFields from "@/components/ProvinceCityFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatClubScheduleEs, weekdayShortLabel } from "@/lib/clubSchedule";
import { cn } from "@/lib/utils";

const ALL_DAYS: WeekdayIso[] = [1, 2, 3, 4, 5, 6, 7];

export default function ClubSettingsScreen() {
  const { clubId } = useMockSession();
  const qc = useQueryClient();
  const { data: club, isLoading } = useQuery({
    queryKey: ["club", clubId],
    queryFn: () => Api.ClubService().getById(clubId),
  });

  const [name, setName] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("23:00");
  const [openDays, setOpenDays] = useState<WeekdayIso[]>(ALL_DAYS);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!club) return;
    setName(club.name);
    setProvince(club.province ?? "");
    setCity(club.city ?? "");
    setOpenTime(club.openTime);
    setCloseTime(club.closeTime);
    setOpenDays(
      club.openDays?.length ? [...club.openDays].sort((a, b) => a - b) : ALL_DAYS,
    );
    setError(null);
  }, [club]);

  const clearSavedOnEdit = () => {
    if (savedMsg) setSavedMsg(null);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!province.trim() || !city.trim()) {
        throw new Error("Elegí provincia y localidad");
      }
      return Api.ClubService().update(clubId, {
        name: name.trim(),
        province: province.trim() || null,
        city: city.trim() || null,
        openTime,
        closeTime,
        openDays,
      });
    },
    onSuccess: async () => {
      setSavedMsg("✓ Configuración guardada");
      setError(null);
      await qc.invalidateQueries({ queryKey: ["club", clubId] });
      await qc.invalidateQueries({ queryKey: ["court-agenda"] });
    },
    onError: (err: Error) => {
      setError(err.message || "No se pudo guardar");
      setSavedMsg(null);
    },
  });

  const toggleDay = (day: WeekdayIso) => {
    setOpenDays((prev) => {
      const has = prev.includes(day);
      if (has) return prev.filter((d) => d !== day);
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  if (isLoading || !club) {
    return <p className="text-sm text-muted-foreground">Cargando configuración…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6" data-testid="club-settings">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Configuración</h2>
        <p className="text-sm text-muted-foreground">
          Datos del club, ubicación y horario de apertura. Ese horario vale
          para todas las canchas.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-medium">Club</h3>
        <div className="space-y-1.5">
          <Label htmlFor="club-name">Nombre</Label>
          <Input
            id="club-name"
            value={name}
            onChange={(e) => {
              clearSavedOnEdit();
              setName(e.target.value);
            }}
          />
        </div>
        <ProvinceCityFields
          idPrefix="club"
          province={province}
          city={city}
          onProvinceChange={(next) => {
            clearSavedOnEdit();
            setProvince(next);
          }}
          onCityChange={(next) => {
            clearSavedOnEdit();
            setCity(next);
          }}
        />
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <h3 className="text-sm font-medium">Horario de apertura</h3>
          <p className="text-xs text-muted-foreground">
            Vista previa:{" "}
            {formatClubScheduleEs(openTime, closeTime, openDays)}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="club-open-time">Apertura</Label>
            <Input
              id="club-open-time"
              type="time"
              value={openTime}
              onChange={(e) => {
                clearSavedOnEdit();
                setOpenTime(e.target.value);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="club-close-time">Cierre</Label>
            <Input
              id="club-close-time"
              type="time"
              value={closeTime}
              onChange={(e) => {
                clearSavedOnEdit();
                setCloseTime(e.target.value);
              }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Días de apertura</Label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_DAYS.map((day) => {
              const active = openDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs font-medium",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground",
                  )}
                  onClick={() => {
                    clearSavedOnEdit();
                    toggleDay(day);
                  }}
                >
                  {weekdayShortLabel(day)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {savedMsg ? <p className="text-sm text-success">{savedMsg}</p> : null}

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={
            saveMutation.isPending ||
            !name.trim() ||
            !province.trim() ||
            !city.trim() ||
            openDays.length === 0
          }
          onClick={() => void saveMutation.mutateAsync()}
        >
          {saveMutation.isPending ? "Guardando…" : "Guardar configuración"}
        </Button>
      </div>
    </div>
  );
}
