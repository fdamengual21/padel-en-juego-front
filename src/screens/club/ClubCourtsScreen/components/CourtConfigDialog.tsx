import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Club, Court, CourtPriceRule, WeekdayIso } from "@core-api";
import { validateCourtPriceRules } from "@core-api";
import Api from "@/api/Api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatClubScheduleEs } from "@/lib/clubSchedule";
import { ROUTES } from "@/router/routes";

interface CourtConfigDialogProps {
  open: boolean;
  club: Club;
  court: Court;
  priceRules: CourtPriceRule[];
  onOpenChange: (open: boolean) => void;
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

export default function CourtConfigDialog({
  open,
  club,
  court,
  priceRules,
  onOpenChange,
  onSaved,
}: CourtConfigDialogProps) {
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(90);
  const [basePrice, setBasePrice] = useState("0");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deletedRuleIds, setDeletedRuleIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setSlotDurationMinutes(court.slotDurationMinutes === 120 ? 120 : 90);
    setBasePrice(String(court.basePrice));
    setOpenTime(court.openTime ?? "");
    setCloseTime(court.closeTime ?? "");
    setRules(priceRules.map(toRuleDraft));
    setDeletedRuleIds([]);
    setError(null);
    setBusy(false);
  }, [open, court, priceRules]);

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
      const price = Number(basePrice);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Precio base inválido");
      }

      const draftRules = rules.map((rule) => ({
        startTime: rule.startTime,
        endTime: rule.endTime,
        daysOfWeek: rule.daysOfWeek,
        price: Number(rule.price),
      }));
      const rulesError = validateCourtPriceRules(draftRules);
      if (rulesError) {
        throw new Error(rulesError);
      }

      await Api.TournamentOpsService().updateCourt(court.id, {
        slotDurationMinutes,
        basePrice: price,
        openTime: openTime.trim() || null,
        closeTime: closeTime.trim() || null,
      });

      const idsToRemove = new Set<string>([
        ...priceRules.map((rule) => rule.id),
        ...deletedRuleIds,
      ]);
      for (const id of idsToRemove) {
        await Api.TournamentOpsService().deleteCourtPriceRule(id);
      }

      for (const rule of rules) {
        const rulePrice = Number(rule.price);
        await Api.TournamentOpsService().upsertCourtPriceRule({
          courtId: court.id,
          startTime: rule.startTime,
          endTime: rule.endTime,
          daysOfWeek: rule.daysOfWeek,
          price: rulePrice,
          label: rule.label.trim() || null,
        });
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-xl overflow-y-auto"
        data-testid="court-config-dialog"
      >
        <DialogHeader>
          <DialogTitle>Configurar {court.name}</DialogTitle>
          <DialogDescription>
            Duración del turno, precio base, override opcional de horario y
            tarifas. El horario del club se define en Configuración.
          </DialogDescription>
        </DialogHeader>

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
              <Link
                to={ROUTES.club.settings}
                className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => onOpenChange(false)}
              >
                Ir a Configuración
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="slot-duration">Duración del turno</Label>
              <select
                id="slot-duration"
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                value={slotDurationMinutes}
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
                onChange={(e) => setBasePrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="court-open">Apertura cancha (opcional)</Label>
              <Input
                id="court-open"
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Vacío = hereda del club ({club.openTime})
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="court-close">Cierre cancha (opcional)</Label>
              <Input
                id="court-close"
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Vacío = hereda del club ({club.closeTime})
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Tarifas</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRules((prev) => [...prev, emptyRuleDraft()])}
              >
                Agregar tarifa
              </Button>
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
                            className={
                              active
                                ? "rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
                                : "rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
                            }
                            onClick={() => toggleDay(index, day.value)}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-destructive"
                        onClick={() => {
                          const current = rules[index];
                          if (current?.id) {
                            setDeletedRuleIds((prev) => [...prev, current.id!]);
                          }
                          setRules((prev) => prev.filter((_, i) => i !== index));
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button type="button" disabled={busy} onClick={() => void handleSave()}>
            {busy ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
