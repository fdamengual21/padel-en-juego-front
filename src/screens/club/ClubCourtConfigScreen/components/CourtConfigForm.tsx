import { useEffect, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link } from "react-router-dom";
import * as yup from "yup";
import type { Club, Court, CourtPriceRule, CourtStatus, WeekdayIso } from "@/domain";
import {
  COURT_STATUS_LABELS,
  findPriceRuleOverlap,
  inspectPriceRuleJornada,
} from "@/domain";
import Api from "@/api/Api";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  applyApiFieldErrors,
  fieldErrorsFromUnknown,
  firstErrorPath,
  scrollToFormField,
} from "@/lib/formFieldErrors";
import ImagePickerField from "@/components/ImagePickerField";
import { FieldHint, InputField, SelectField } from "@/components/Form";
import { Button } from "@/components/ui/button";
import { PERMISSION_CLUB_SETTINGS_READ } from "@/authorization/permissionCodes";
import { PermissionsGuard } from "@/components/guards";
import { Label } from "@/components/ui/label";
import { clubClosesNextDay, formatClubScheduleEs } from "@/lib/clubSchedule";
import { ROUTES } from "@/router/routes";
import { cn } from "@/lib/utils";

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

const STATUS_OPTIONS = (Object.keys(COURT_STATUS_LABELS) as CourtStatus[]).map(
  (value) => ({ value, label: COURT_STATUS_LABELS[value] }),
);

interface PriceRuleFormValue {
  id?: string;
  startTime: string;
  endTime: string;
  daysOfWeek: WeekdayIso[];
  price: number | null;
  label: string;
}

interface CourtConfigFormValues {
  name: string;
  status: CourtStatus;
  slotDurationMinutes: number;
  basePrice: number | null;
  priceRules: PriceRuleFormValue[];
}

function jornadaContext(club: Club) {
  return {
    openTime: club.openTime || null,
    closeTime: club.closeTime || null,
    openDays: club.openDays ?? [],
  };
}

const schema = yup.object({
  name: yup.string().trim().required("Ingresá el nombre de la cancha"),
  status: yup.mixed<CourtStatus>().required("Elegí un estado"),
  slotDurationMinutes: yup
    .number()
    .oneOf([90, 120], "Elegí 90 o 120 minutos")
    .required("Elegí la duración del turno"),
  basePrice: yup
    .number()
    .nullable()
    .test("base-price", "Precio base inválido", (value) => value != null && value >= 0),
  priceRules: yup
    .array()
    .of(
      yup.object({
        id: yup.string().optional(),
        startTime: yup
          .string()
          .required("Indicá desde qué hora")
          .test("jornada-start", function (value) {
            const club = jornadaContextFromYup(this.options.context);
            if (!club || !value) return true;
            const issues = inspectPriceRuleJornada(
              {
                startTime: value,
                endTime: this.parent.endTime,
                daysOfWeek: this.parent.daysOfWeek ?? [],
              },
              club,
            );
            if (issues?.startTime) {
              return this.createError({ message: issues.startTime });
            }
            return true;
          }),
        endTime: yup
          .string()
          .required("Indicá hasta qué hora")
          .test("jornada-end", function (value) {
            const club = jornadaContextFromYup(this.options.context);
            if (!club || !value) return true;
            const issues = inspectPriceRuleJornada(
              {
                startTime: this.parent.startTime,
                endTime: value,
                daysOfWeek: this.parent.daysOfWeek ?? [],
              },
              club,
            );
            if (issues?.endTime) {
              return this.createError({ message: issues.endTime });
            }
            return true;
          }),
        daysOfWeek: yup
          .array()
          .of(
            yup
              .number()
              .oneOf([1, 2, 3, 4, 5, 6, 7])
              .required() as yup.NumberSchema<WeekdayIso>,
          )
          .min(1, "Elegí al menos un día")
          .required("Elegí al menos un día")
          .test("open-days", function (value) {
            const club = jornadaContextFromYup(this.options.context);
            if (!club || !value?.length) return true;
            const issues = inspectPriceRuleJornada(
              {
                startTime: this.parent.startTime,
                endTime: this.parent.endTime,
                daysOfWeek: value as WeekdayIso[],
              },
              club,
            );
            if (issues?.daysOfWeek) {
              return this.createError({ message: issues.daysOfWeek });
            }
            return true;
          }),
        price: yup
          .number()
          .nullable()
          .test("rule-price", "Precio inválido", (value) => value != null && value >= 0),
        label: yup.string().default(""),
      }),
    )
    .required()
    .test("no-overlap", function (rules) {
      const overlap = findPriceRuleOverlap(
        (rules ?? []).map((rule) => ({
          startTime: rule.startTime,
          endTime: rule.endTime,
          daysOfWeek: rule.daysOfWeek,
          price: rule.price ?? 0,
        })),
      );
      if (!overlap) return true;
      return this.createError({
        path: `${this.path}.${overlap.right}.startTime`,
        message: overlap.message,
      });
    }),
});

function jornadaContextFromYup(context: unknown) {
  if (!context || typeof context !== "object") return null;
  const club = context as {
    openTime?: string | null;
    closeTime?: string | null;
    openDays?: WeekdayIso[];
  };
  return {
    openTime: club.openTime ?? null,
    closeTime: club.closeTime ?? null,
    openDays: club.openDays ?? [],
  };
}

function toFormValues(court: Court, priceRules: CourtPriceRule[]): CourtConfigFormValues {
  return {
    name: court.name,
    status: court.status,
    slotDurationMinutes: court.slotDurationMinutes === 120 ? 120 : 90,
    basePrice: court.basePrice,
    priceRules: priceRules.map((rule) => ({
      id: rule.id,
      startTime: rule.startTime,
      endTime: rule.endTime,
      daysOfWeek: [...rule.daysOfWeek],
      price: rule.price,
      label: rule.label ?? "",
    })),
  };
}

function hasPriceRuleErrors(errors: unknown): boolean {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.some(Boolean);
  if (typeof errors === "object" && "message" in errors) {
    return Boolean((errors as { message?: string }).message);
  }
  return true;
}

function emptyRule(club: Club, basePrice: number | null): PriceRuleFormValue {
  return {
    startTime: club.openTime || "18:00",
    endTime: club.closeTime || "23:00",
    daysOfWeek: club.openDays.length > 0 ? [...club.openDays] : [1, 2, 3, 4, 5],
    price: basePrice ?? 0,
    label: "",
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const form = useForm<CourtConfigFormValues>({
    resolver: yupResolver(schema) as never,
    mode: "onChange",
    criteriaMode: "all",
    shouldFocusError: true,
    context: jornadaContext(club),
    defaultValues: toFormValues(court, priceRules),
  });

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    setValue,
    trigger,
    watch,
    formState: { isSubmitting, isValid, errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "priceRules",
  });

  const watchedRules = watch("priceRules");
  const basePrice = watch("basePrice");
  const overnight = Boolean(
    club.openTime && club.closeTime && clubClosesNextDay(club.openTime, club.closeTime),
  );
  const startHint = club.openTime
    ? overnight
      ? `Conviene alinearlo con la apertura del club (${club.openTime}). La madrugada hasta ${club.closeTime} cuenta como el día en que abre.`
      : `Conviene alinearlo con la apertura del club (${club.openTime}).`
    : "Conviene alinearlo con la apertura del club.";
  const endHint = club.closeTime
    ? overnight
      ? `Conviene alinearlo con el cierre del club (${club.closeTime}). Esa hora es del día en que abre.`
      : `Conviene alinearlo con el cierre del club (${club.closeTime}).`
    : "Conviene alinearlo con el cierre del club.";

  useEffect(() => {
    reset(toFormValues(court, priceRules));
    setPhotoFile(null);
    setRemovePhoto(false);
    void trigger();
  }, [court, priceRules, reset, trigger]);

  const focusFirstError = (formErrors: typeof errors) => {
    const path = firstErrorPath(formErrors);
    if (!path) return;
    scrollToFormField(path);
  };

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        if (values.basePrice == null) throw new Error("Precio base inválido");
        await Api.CourtService().update(court.id, {
          name: values.name.trim(),
          slotDurationMinutes: values.slotDurationMinutes,
          basePrice: values.basePrice,
          status: values.status,
          priceRules: values.priceRules.map((rule) => ({
            startTime: rule.startTime,
            endTime: rule.endTime,
            daysOfWeek: rule.daysOfWeek,
            price: Number(rule.price),
            label: rule.label.trim() || null,
          })),
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
        const apiFields = fieldErrorsFromUnknown(err);
        if (apiFields) {
          const paths = applyApiFieldErrors(setError, apiFields);
          const first = paths[0];
          if (first) {
            void setFocus(first);
            scrollToFormField(first);
          }
        }
        toastError("No se pudo guardar la cancha", message);
      }
    },
    (formErrors) => {
      focusFirstError(formErrors);
    },
  );

  const shownPhoto = photoFile || removePhoto ? null : court.imageUrl;
  const hasSchedule = Boolean(club.openTime && club.closeTime);

  return (
    <FormProvider {...form}>
      <form className="space-y-5" data-testid="court-config-form" onSubmit={onSubmit} noValidate>
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
                  {hasSchedule
                    ? formatClubScheduleEs(
                        club.openTime,
                        club.closeTime,
                        club.openDays ?? [],
                      )
                    : "Sin horario de apertura."}
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

          <InputField
            control={control}
            name="name"
            label="Nombre"
            disabled={readOnly}
          />

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

          <SelectField
            control={control}
            name="status"
            label="Estado"
            disabled={readOnly}
            options={STATUS_OPTIONS}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              control={control}
              name="slotDurationMinutes"
              label="Duración del turno"
              disabled={readOnly}
              valueAs="number"
              options={[
                { value: "90", label: "90 minutos" },
                { value: "120", label: "120 minutos" },
              ]}
            />
            <InputField
              control={control}
              name="basePrice"
              label="Precio base (ARS)"
              type="number"
              min={0}
              disabled={readOnly}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Tarifas</p>
              {!readOnly ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => append(emptyRule(club, basePrice))}
                >
                  Agregar tarifa
                </Button>
              ) : null}
            </div>
            {hasPriceRuleErrors(errors.priceRules) ? (
              <p className="text-xs text-destructive">
                Algunas tarifas no coinciden con el horario actual del club.
              </p>
            ) : null}

            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin tarifas: se usa el precio base.
              </p>
            ) : (
              <ul className="space-y-3">
                {fields.map((field, index) => {
                  const dayError = errors.priceRules?.[index]?.daysOfWeek?.message;
                  const daysId = `priceRules.${index}.daysOfWeek`;
                  return (
                    <li
                      key={field.id}
                      className="space-y-2 rounded-lg border border-border p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        <InputField
                          control={control}
                          name={`priceRules.${index}.startTime`}
                          label="Desde"
                          type="time"
                          disabled={readOnly}
                          hint={startHint}
                        />
                        <InputField
                          control={control}
                          name={`priceRules.${index}.endTime`}
                          label="Hasta"
                          type="time"
                          disabled={readOnly}
                          hint={endHint}
                        />
                        <InputField
                          control={control}
                          name={`priceRules.${index}.price`}
                          label="Precio"
                          type="number"
                          min={0}
                          disabled={readOnly}
                        />
                        <InputField
                          control={control}
                          name={`priceRules.${index}.label`}
                          label="Etiqueta"
                          disabled={readOnly}
                        />
                      </div>
                      <div className="space-y-1">
                        <div
                          id={daysId}
                          tabIndex={-1}
                          className="flex flex-wrap items-center gap-1 outline-none"
                        >
                          {WEEKDAY_OPTIONS.map((day) => {
                            const selected = watchedRules[index]?.daysOfWeek ?? [];
                            const active = selected.includes(day.value);
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
                                  const next = active
                                    ? selected.filter((item) => item !== day.value)
                                    : [...selected, day.value].sort((a, b) => a - b);
                                  setValue(`priceRules.${index}.daysOfWeek`, next, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
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
                              onClick={() => remove(index)}
                            >
                              Eliminar
                            </Button>
                          ) : null}
                        </div>
                        {dayError ? (
                          <p id={`${daysId}-error`} className="text-xs text-destructive">
                            {dayError}
                          </p>
                        ) : null}
                        <FieldHint>
                          Si el club cierra de madrugada, esa franja es del día en que abre.
                        </FieldHint>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Volver
          </Button>
          {!readOnly ? (
            <Button
              type="submit"
              disabled={isSubmitting || !isValid}
              className={cn(isSubmitting && "opacity-80")}
            >
              {isSubmitting ? "Guardando…" : "Guardar"}
            </Button>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
}
