import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as yup from "yup";
import type { WeekdayIso } from "@/domain";
import Api from "@/api/Api";
import { useMockSession } from "@/app/MockSessionProvider";
import {
  PERMISSION_CLUB_SETTINGS_UPDATE,
} from "@/authorization/permissionCodes";
import { usePermissions } from "@/authorization";
import { PermissionsGuard } from "@/components/guards";
import { InputField, PhoneField } from "@/components/Form";
import GeographySelectFields from "@/components/GeographySelectFields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  formatClubScheduleEs,
  parseClockMinutes,
  weekdayShortLabel,
} from "@/lib/clubSchedule";
import {
  combinePhone,
  DEFAULT_PHONE_DIAL,
  isValidOptionalPhone,
  splitE164,
} from "@/lib/phone";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ClubSettings } from "@/modules/clubs";
import { useAuthStore } from "@/stores/authStore";
import ClubBrandHeader from "./components/ClubBrandHeader";

const ALL_DAYS: WeekdayIso[] = [1, 2, 3, 4, 5, 6, 7];
const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;

const schema = yup.object({
  name: yup.string().trim().required("Ingresá el nombre del club"),
  provinceId: yup
    .number()
    .nullable()
    .test("province", "Seleccioná la provincia", (value) => value != null && value >= 1),
  municipalityId: yup
    .number()
    .nullable()
    .test(
      "municipality",
      "Seleccioná la localidad",
      (value) => value != null && value >= 1,
    ),
  street: yup.string().trim().required("Ingresá la calle del predio"),
  streetNumber: yup.string().trim().required("Ingresá la altura del predio"),
  googleMapsUrl: yup
    .string()
    .trim()
    .transform((value) => (value === "" ? "" : value))
    .test("maps-url", "El link debe ser http o https", (value) => {
      if (!value?.trim()) return true;
      try {
        const url = new URL(value.trim());
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }),
  instagramHandle: yup
    .string()
    .trim()
    .test(
      "instagram",
      "Ingresá un usuario de Instagram válido",
      (value) => {
        if (!value?.trim()) return true;
        const trimmed = value.trim();
        if (/instagram\.com/i.test(trimmed)) return true;
        return INSTAGRAM_HANDLE.test(trimmed.replace(/^@/, ""));
      },
    ),
  phoneDialCode: yup.string().default(DEFAULT_PHONE_DIAL),
  phoneNational: yup
    .string()
    .default("")
    .test("phone", "Ingresá el teléfono del club", function (value) {
      const phone = combinePhone(this.parent.phoneDialCode, value);
      if (!phone) return false;
      return isValidOptionalPhone(this.parent.phoneDialCode, value);
    }),
  openTime: yup.string().required("Indicá el horario de apertura"),
  closeTime: yup
    .string()
    .required("Indicá el horario de cierre")
    .test(
      "not-same-as-open",
      "El cierre no puede coincidir con la apertura",
      function (value) {
        const open = parseClockMinutes(
          (this.parent.openTime as string | undefined) ?? "",
        );
        const close = parseClockMinutes(value ?? "");
        if (open == null || close == null) return true;
        return close !== open;
      },
    ),
  openDays: yup
    .array()
    .of(yup.number().oneOf(ALL_DAYS).required())
    .min(1, "Elegí al menos un día de apertura")
    .required(),
});

type ClubSettingsFormValues = yup.InferType<typeof schema>;

function toFormValues(club: ClubSettings): ClubSettingsFormValues {
  const phone = splitE164(club.phone);
  const openDays =
    club.openDays.length > 0 ? [...club.openDays].sort((a, b) => a - b) : ALL_DAYS;
  return {
    name: club.name ?? "",
    provinceId: club.provinceId,
    municipalityId: club.municipalityId,
    street: club.street ?? "",
    streetNumber: club.streetNumber ?? "",
    googleMapsUrl: club.googleMapsUrl ?? "",
    instagramHandle: club.instagramHandle ?? "",
    phoneDialCode: phone.dialCode,
    phoneNational: phone.national,
    openTime: club.openTime ?? "08:00",
    closeTime: club.closeTime ?? "23:00",
    openDays,
  };
}

export default function ClubSettingsScreen() {
  const { clubId } = useMockSession();
  const { can } = usePermissions();
  const canUpdate = can(PERMISSION_CLUB_SETTINGS_UPDATE);
  const qc = useQueryClient();
  const setUserProfile = useAuthStore((state) => state.setUserProfile);

  const { data: club, isLoading, isError, error } = useQuery({
    queryKey: ["club-settings", clubId],
    queryFn: () => Api.ClubService().getSettings(),
    enabled: Boolean(clubId),
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isValid, errors },
  } = useForm<ClubSettingsFormValues>({
    resolver: yupResolver(schema) as never,
    mode: "onChange",
    defaultValues: {
      name: "",
      provinceId: null,
      municipalityId: null,
      street: "",
      streetNumber: "",
      googleMapsUrl: "",
      instagramHandle: "",
      phoneDialCode: DEFAULT_PHONE_DIAL,
      phoneNational: "",
      openTime: "08:00",
      closeTime: "23:00",
      openDays: ALL_DAYS,
    },
  });

  useEffect(() => {
    if (!club) return;
    reset(toFormValues(club));
  }, [club, reset]);

  const provinceId = watch("provinceId");
  const municipalityId = watch("municipalityId");
  const openTime = watch("openTime");
  const closeTime = watch("closeTime");
  const openDays = (watch("openDays") ?? []) as WeekdayIso[];

  const saveMutation = useMutation({
    mutationFn: (values: ClubSettingsFormValues) => {
      const phone = combinePhone(values.phoneDialCode, values.phoneNational);
      if (values.provinceId == null || values.municipalityId == null) {
        throw new Error("Elegí provincia y localidad");
      }
      return Api.ClubService().updateSettings({
        name: values.name.trim(),
        provinceId: values.provinceId,
        municipalityId: values.municipalityId,
        street: values.street.trim(),
        streetNumber: values.streetNumber.trim(),
        latitude: club?.latitude ?? null,
        longitude: club?.longitude ?? null,
        googleMapsUrl: (values.googleMapsUrl ?? "").trim() || null,
        phone,
        instagramHandle: (values.instagramHandle ?? "").trim() || null,
        openTime: values.openTime,
        closeTime: values.closeTime,
        openDays: [...values.openDays].sort((a, b) => a - b) as WeekdayIso[],
      });
    },
    onSuccess: async (updated) => {
      qc.setQueryData(["club-settings", clubId], updated);
      toastSuccess("Configuración guardada");
      try {
        const me = await Api.UserService().me();
        setUserProfile(me);
      } catch {
        /* el nombre del sidebar sale de club-settings */
      }
      await qc.invalidateQueries({ queryKey: ["court-agenda"] });
      await qc.invalidateQueries({ queryKey: ["court-agenda-board"] });
    },
    onError: (err: Error) => {
      toastError("No se pudo guardar", err.message);
    },
  });

  const toggleDay = (day: WeekdayIso) => {
    const next = openDays.includes(day)
      ? openDays.filter((item) => item !== day)
      : [...openDays, day].sort((a, b) => a - b);
    setValue("openDays", next, { shouldDirty: true, shouldValidate: true });
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Cargando configuración…</p>;
  }

  if (isError || !club) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "No se pudo cargar la configuración"}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6" data-testid="club-settings">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Configuración</h2>
        <p className="text-sm text-muted-foreground">
          Ficha del predio: imágenes, contacto, dirección y horario. Ese
          horario vale para todas las canchas.
        </p>
      </div>

      <ClubBrandHeader club={club} canEdit={canUpdate} />

      <form
        className="space-y-6"
        onSubmit={handleSubmit((values) => {
          if (!canUpdate) return;
          void saveMutation.mutateAsync(values);
        })}
      >
        <section className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium">Club</h3>
          <InputField
            control={control}
            name="name"
            label="Nombre"
            required
            disabled={!canUpdate}
          />
          <GeographySelectFields
            idPrefix="club"
            required
            disabled={!canUpdate}
            provinceId={provinceId ?? null}
            municipalityId={municipalityId ?? null}
            provinceError={errors.provinceId?.message}
            municipalityError={errors.municipalityId?.message}
            municipalityHint={null}
            onProvinceChange={(id) => {
              setValue("provinceId", id, {
                shouldDirty: true,
                shouldValidate: true,
              });
              if (id !== provinceId) {
                setValue("municipalityId", null, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }}
            onMunicipalityChange={(id) => {
              setValue("municipalityId", id, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
          />
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <InputField
              control={control}
              name="street"
              label="Calle"
              required
              disabled={!canUpdate}
            />
            <InputField
              control={control}
              name="streetNumber"
              label="Altura"
              required
              disabled={!canUpdate}
            />
          </div>
          <InputField
            control={control}
            name="googleMapsUrl"
            label="Google Maps"
            type="url"
            disabled={!canUpdate}
            hint="Opcional. Pegá el link del predio."
          />
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium">Contacto</h3>
          <PhoneField
            control={control}
            dialName="phoneDialCode"
            nationalName="phoneNational"
            label="Teléfono"
            required
            disabled={!canUpdate}
          />
          <InputField
            control={control}
            name="instagramHandle"
            label="Instagram"
            disabled={!canUpdate}
            hint="Opcional. Usuario o URL, se guarda sin @."
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
            <InputField
              control={control}
              name="openTime"
              label="Apertura"
              type="time"
              required
              disabled={!canUpdate}
            />
            <InputField
              control={control}
              name="closeTime"
              label="Cierre"
              type="time"
              required
              disabled={!canUpdate}
              hint="Si es anterior a la apertura, cierra al día siguiente. Esos turnos siguen siendo del día en que abre."
            />
          </div>
          <div className="space-y-2">
            <Label>
              Días de apertura
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_DAYS.map((day) => {
                const active = openDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={!canUpdate}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-xs font-medium disabled:opacity-70",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground",
                    )}
                    onClick={() => {
                      if (!canUpdate) return;
                      toggleDay(day);
                    }}
                  >
                    {weekdayShortLabel(day)}
                  </button>
                );
              })}
            </div>
            {errors.openDays?.message ? (
              <p className="text-xs text-destructive">{errors.openDays.message}</p>
            ) : null}
          </div>
        </section>

        <div className="flex justify-end">
          <PermissionsGuard permission={PERMISSION_CLUB_SETTINGS_UPDATE}>
            <Button
              type="submit"
              disabled={saveMutation.isPending || isSubmitting || !isValid}
              data-testid="club-settings-save"
            >
              {saveMutation.isPending || isSubmitting
                ? "Guardando…"
                : "Guardar configuración"}
            </Button>
          </PermissionsGuard>
        </div>
      </form>
    </div>
  );
}
