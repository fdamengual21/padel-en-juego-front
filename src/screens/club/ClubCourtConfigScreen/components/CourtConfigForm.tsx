import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Club, Court, CourtPriceRule, CourtStatus, WeekdayIso } from "@/domain";
import { COURT_STATUS_LABELS, validateCourtPriceRules } from "@/domain";
import Api from "@/api/Api";
import { toastError, toastSuccess } from "@/lib/toast";
import ImagePickerField from "@/components/ImagePickerField";
import { Button } from "@/components/ui/button";
import { PERMISSION_CLUB_SETTINGS_READ } from "@/authorization/permissionCodes";
import { PermissionsGuard } from "@/components/guards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatClubScheduleEs } from "@/lib/clubSchedule";
import { ROUTES } from "@/router/routes";

interface CourtConfigFormProps {
  club: Club;
  court: Court;
  priceRules: CourtPriceRule[];
  readOnly?: boolean;
  onCancel: () => void;
  onSaved: () => void;
}

const WEEKDAY_OPTIONS: { value: WeekdayIso; label: string }[] = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "X" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 7, label: "D" },
];

interface RuleDraft {
  id?: string;
  startTime: string;
  endTime: string;
  daysOfWeek: WeekdayIso[];
  price: string;
  label: string;
}

function emptyRuleDraft(): RuleDraft {
  return {
    startTime: "18:00",
    endTime: "23:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    price: "16000",
    label: "",
  };
}

function toRuleDraft(rule: CourtPriceRule): RuleDraft {
  return {
    id: rule.id,
    startTime: rule.startTime,
    endTime: rule.endTime,
    daysOfWeek: [...rule.daysOfWeek],
    price: String(rule.price),
    label: rule.label ?? "",
  };
}

export default function CourtConfigForm({
  club,
  court,
  priceRules,
  readOnly = false,
  onCancel,
  onSaved,
}: CourtConfigFormProps) {
  const [name, setName] = useState(court.name);
  const [status, setStatus] = useState<CourtStatus>(court.status);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(90);
  const [basePrice, setBasePrice] = useState("0");
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(court.name);
    setStatus(court.status);
    setSlotDurationMinutes(court.slotDurationMinutes === 120 ? 120 : 90);
    setBasePrice(String(court.basePrice));
    setRules(priceRules.map(toRuleDraft));
    setPhotoFile(null);
    setRemovePhoto(false);
    setError(null);
    setBusy(false);
  }, [court, priceRules]);

  const toggleDay = (index: number, day: WeekdayIso) => {
    setRules((prev) =>
      prev.map((rule, i) => {
        if (i !== index) return rule;
        const has = rule.daysOfWeek.includes(day);
        return {
          ...rule,
          daysOfWeek: has
            ? rule.daysOfWeek.filter((d) => d !== day)
            : [...rule.daysOfWeek, day].sort((a, b) => a - b),
        };
      }),
    );
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!name.trim()) throw new Error("Ingresá el nombre de la cancha");
      const price = Number(basePrice);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Precio base inválido");
      }

      const draftRules = rules.map((rule) => ({
        startTime: rule.startTime,
        endTime: rule.endTime,
        daysOfWeek: rule.daysOfWeek,
        price: Number(rule.price),
        label: rule.label.trim() || null,
      }));
      const rulesError = validateCourtPriceRules(draftRules);
      if (rulesError) {
        throw new Error(rulesError);
      }

      await Api.CourtService().update(court.id, {
        name: name.trim(),
        slotDurationMinutes,
        basePrice: price,
        status,
        priceRules: draftRules,
      });

      if (photoFile) {
        await Api.CourtService().uploadPhoto(court.id, photoFile);
      } else if (removePhoto && court.imageUrl) {
        await Api.CourtService().deletePhoto(court.id);
      }

      toastSuccess("Cancha actualizada");
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar";
      setError(message);
      toastError("No se pudo guardar la cancha", message);
    } finally {
      setBusy(false);
    }
  };

  const shownPhoto =
    photoFile || removePhoto ? null : court.imageUrl;

  return (
    <div className="space-y-5" data-testid="court-config-form">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Configurar {court.name}</h2>
          <p className="text-sm text-muted-foreground">
            Duración del turno, precio base y tarifas. El horario de apertura
            es único del club y se edita en Configuración.
          </p>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Horario del club</p>
                <p className="text-sm text-muted-foreground">
                  {formatClubScheduleEs(
                    club.openTime,
                    club.closeTime,
                    club.openDays ?? [],
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Solo lectura. Se edita en Configuración del club.
                </p>
              </div>
              <PermissionsGuard permission={PERMISSION_CLUB_SETTINGS_READ}>
                <Link
                  to={ROUTES.club.settings}
                  className="text-xs font-medium text-sidebar underline-offset-2 hover:underline"
                >
                  Ir a Configuración
                </Link>
              </PermissionsGuard>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="court-name">Nombre</Label>
            <Input
              id="court-name"
              value={name}
              disabled={readOnly}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="court-photo">Foto</Label>
            <ImagePickerField
              id="court-photo"
              imageUrl={shownPhoto}
              file={photoFile}
              canEdit={!readOnly}
              ariaLabel="Editar foto de la cancha"
              testId="court-photo-picker"
              onFileSelect={(file) => {
                setPhotoFile(file);
                setRemovePhoto(false);
              }}
            />
            {!readOnly && court.imageUrl && !removePhoto ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPhotoFile(null);
                  setRemovePhoto(true);
                }}
              >
                Quitar foto
              </Button>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="court-status">Estado</Label>
            <select
              id="court-status"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              value={status}
              disabled={readOnly}
              onChange={(event) => setStatus(event.target.value as CourtStatus)}
            >
              {(Object.keys(COURT_STATUS_LABELS) as CourtStatus[]).map((value) => (
                <option key={value} value={value}>
                  {COURT_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="slot-duration">Duración del turno</Label>
              <select
                id="slot-duration"
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                value={slotDurationMinutes}
                disabled={readOnly}
                onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
              >
                <option value={90}>90 minutos</option>
                <option value={120}>120 minutos</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="base-price">Precio base (ARS)</Label>
              <Input
                id="base-price"
                type="number"
                min={0}
                value={basePrice}
                disabled={readOnly}
                onChange={(e) => setBasePrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Tarifas</p>
              {!readOnly ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setRules((prev) => [...prev, emptyRuleDraft()])}
                >
                  Agregar tarifa
                </Button>
              ) : null}
            </div>

            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin tarifas: se usa el precio base.
              </p>
            ) : (
              <ul className="space-y-3">
                {rules.map((rule, index) => (
                  <li
                    key={rule.id ?? `new-${index}`}
                    className="space-y-2 rounded-lg border border-border p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Desde</Label>
                        <Input
                          type="time"
                          value={rule.startTime}
                          disabled={readOnly}
                          onChange={(e) =>
                            setRules((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? { ...item, startTime: e.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Hasta</Label>
                        <Input
                          type="time"
                          value={rule.endTime}
                          disabled={readOnly}
                          onChange={(e) =>
                            setRules((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? { ...item, endTime: e.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Precio</Label>
                        <Input
                          type="number"
                          min={0}
                          value={rule.price}
                          disabled={readOnly}
                          onChange={(e) =>
                            setRules((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? { ...item, price: e.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Etiqueta</Label>
                        <Input
                          value={rule.label}
                          placeholder="Ej. Finde noche"
                          disabled={readOnly}
                          onChange={(e) =>
                            setRules((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? { ...item, label: e.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {WEEKDAY_OPTIONS.map((day) => {
                        const active = rule.daysOfWeek.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            disabled={readOnly}
                            className={
                              active
                                ? "rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-70"
                                : "rounded-md border border-border px-2 py-1 text-xs text-muted-foreground disabled:opacity-70"
                            }
                            onClick={() => {
                              if (readOnly) return;
                              toggleDay(index, day.value);
                            }}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                      {!readOnly ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="ml-auto text-destructive"
                          onClick={() => {
                            setRules((prev) => prev.filter((_, i) => i !== index));
                          }}
                        >
                          Eliminar
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Volver
          </Button>
          {!readOnly ? (
            <Button type="button" disabled={busy} onClick={() => void handleSave()}>
              {busy ? "Guardando…" : "Guardar"}
            </Button>
          ) : null}
        </div>
    </div>
  );
}
