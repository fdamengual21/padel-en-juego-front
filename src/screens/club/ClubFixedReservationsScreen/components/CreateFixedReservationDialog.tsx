import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import * as yup from "yup";
import Api from "@/api/Api";
import { DateField, SelectField } from "@/components/Form";
import ReservationPlayerField from "@/screens/club/components/ReservationPlayerField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ReservationPlayer } from "@/modules/reservations";

const WEEKDAY_OPTIONS = [
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
  { value: "7", label: "Domingo" },
] as const;

const schema = yup.object({
  courtId: yup.string().trim().required("Elegí una cancha"),
  weekday: yup.number().min(1).max(7).required("Elegí un día"),
  startTime: yup.string().trim().required("Elegí un horario"),
  startsOn: yup.string().nullable(),
});

type FormValues = yup.InferType<typeof schema>;

interface CreateFixedReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function isoWeekday(date: string): number {
  const parsed = dayjs(date);
  const day = parsed.day();
  return day === 0 ? 7 : day;
}

function nextDateForWeekday(weekday: number): string {
  const today = dayjs().startOf("day");
  const todayIso = today.day() === 0 ? 7 : today.day();
  let delta = weekday - todayIso;
  if (delta < 0) delta += 7;
  return today.add(delta, "day").format("YYYY-MM-DD");
}

export default function CreateFixedReservationDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateFixedReservationDialogProps) {
  const [player, setPlayer] = useState<ReservationPlayer | null>(null);
  const [busy, setBusy] = useState(false);
  const courtsQuery = useQuery({
    queryKey: ["courts"],
    queryFn: () => Api.CourtService().list(),
    enabled: open,
  });
  const courts = (courtsQuery.data ?? []).filter((court) => court.status === "active");
  const form = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { courtId: "", weekday: 1, startTime: "", startsOn: "" },
  });
  const courtId = form.watch("courtId");
  const weekday = form.watch("weekday");
  const startsOn = form.watch("startsOn") ?? "";
  const startTime = form.watch("startTime");
  const slotDate = useMemo(() => {
    if (!weekday) return null;
    if (startsOn && isoWeekday(startsOn) === Number(weekday)) return startsOn;
    return nextDateForWeekday(Number(weekday));
  }, [startsOn, weekday]);
  const slotsQuery = useQuery({
    queryKey: ["court-fixed-slots", courtId, slotDate],
    queryFn: () => Api.ReservationService().listSlots(slotDate ?? "", courtId),
    enabled: open && Boolean(courtId) && Boolean(slotDate),
  });

  useEffect(() => {
    if (!open) {
      setPlayer(null);
      form.reset({ courtId: "", weekday: 1, startTime: "", startsOn: "" });
    }
  }, [open, form]);

  useEffect(() => {
    form.setValue("startTime", "");
  }, [courtId, weekday, slotDate, form]);

  const availableSlots = (slotsQuery.data?.slots ?? []).filter(
    (slot) => slot.status !== "pending" && !slot.reservationId,
  );

  const submit = form.handleSubmit(async (values) => {
    if (!player) {
      toastError("Elegí un jugador");
      return;
    }
    if (values.startsOn && isoWeekday(values.startsOn) !== Number(values.weekday)) {
      toastError("La fecha de inicio no cae en el día elegido");
      return;
    }
    setBusy(true);
    try {
      await Api.ReservationService().createFixed({
        playerId: player.id,
        courtId: values.courtId,
        weekday: Number(values.weekday),
        startTime: values.startTime,
        startsOn: values.startsOn || undefined,
      });
      toastSuccess("Turno fijo creado");
      onCreated();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo crear el turno fijo";
      toastError("No se pudo crear el turno fijo", message);
    } finally {
      setBusy(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo turno fijo</DialogTitle>
          <DialogDescription>
            Se repite todas las semanas. El jugador no lo pide desde su inicio.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <ReservationPlayerField value={player} onChange={setPlayer} />
          <SelectField
            control={form.control}
            name="courtId"
            label="Cancha"
            required
            options={courts.map((court) => ({ value: court.id, label: court.name }))}
            allowEmpty
            emptyLabel="Elegí una cancha"
          />
          <SelectField
            control={form.control}
            name="weekday"
            label="Día"
            required
            valueAs="number"
            options={WEEKDAY_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
          />
          <DateField
            control={form.control}
            name="startsOn"
            label="Empieza el"
            minDate={dayjs().format("YYYY-MM-DD")}
            placeholder="La próxima vez de ese día"
          />
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Horario</p>
            {!courtId ? (
              <p className="text-sm text-muted-foreground">Elegí una cancha para ver los turnos.</p>
            ) : slotsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando horarios…</p>
            ) : slotsQuery.data?.closed ? (
              <p className="text-sm text-muted-foreground">
                {slotsQuery.data.message ?? "El club no abre ese día."}
              </p>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay turnos libres ese día.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableSlots.map((slot) => {
                  const label = dayjs(slot.startsAt).format("HH:mm");
                  const selected = startTime === label;
                  return (
                    <button
                      key={slot.startsAt}
                      type="button"
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-sm",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted",
                      )}
                      onClick={() => form.setValue("startTime", label, { shouldValidate: true })}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            {form.formState.errors.startTime ? (
              <p className="text-sm text-destructive">{form.formState.errors.startTime.message}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando…" : "Crear turno fijo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
