import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as yup from "yup";
import { CATEGORY_LEVELS, formatCategoryLevel } from "@/domain";
import Api from "@/api/Api";
import {
  DateField,
  InputField,
  PhoneField,
  SelectField,
} from "@/components/Form";
import GeographySelectFields from "@/components/GeographySelectFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ageFromDateOfBirth, isValidOptionalDateOfBirth } from "@/lib/dateOfBirth";
import {
  isValidArgentineDni,
  normalizeDocumentNumber,
} from "@/lib/documentNumber";
import {
  combinePhone,
  DEFAULT_PHONE_DIAL,
  isValidOptionalPhone,
  splitE164,
} from "@/lib/phone";
import { toastError, toastSuccess } from "@/lib/toast";
import type { UserMeDto } from "@/modules/users";
import { useAuthStore } from "@/stores/authStore";

const schema = yup.object({
  firstName: yup.string().trim().required("Ingresá tu nombre"),
  lastName: yup.string().trim().required("Ingresá tu apellido"),
  documentNumber: yup
    .string()
    .transform((value) => normalizeDocumentNumber(value))
    .required("Ingresá tu DNI")
    .test("dni", "Ingresá un DNI de 7 u 8 dígitos", (value) =>
      isValidArgentineDni(value),
    ),
  sexId: yup
    .number()
    .nullable()
    .transform((_value, original) => {
      if (original === "" || original == null) return null;
      const n = Number(original);
      return Number.isFinite(n) ? n : null;
    })
    .required("Seleccioná tu sexo"),
  dateOfBirth: yup
    .string()
    .nullable()
    .transform((value) => (value === "" || value == null ? null : value))
    .test(
      "date-of-birth",
      "Ingresá una fecha válida (mínimo 12 años)",
      (value) => isValidOptionalDateOfBirth(value),
    ),
  categoryLevel: yup
    .number()
    .nullable()
    .transform((_value, original) => {
      if (original === "" || original == null) return null;
      const n = Number(original);
      return Number.isFinite(n) ? n : null;
    })
    .min(1, "Elegí tu categoría")
    .max(8, "Elegí tu categoría"),
  provinceId: yup.number().nullable(),
  municipalityId: yup
    .number()
    .nullable()
    .test("municipality-if-province", "Elegí tu localidad", function (value) {
      if (this.parent.provinceId == null) return true;
      return value != null;
    }),
  phoneDialCode: yup.string().default(DEFAULT_PHONE_DIAL),
  phoneNational: yup
    .string()
    .default("")
    .test("phone", "Ingresá un teléfono válido", function (value) {
      return isValidOptionalPhone(this.parent.phoneDialCode, value);
    }),
  isPhonePublic: yup.boolean().default(false),
});

function toFormValues(user: UserMeDto) {
  const phone = splitE164(user.phone);
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    documentNumber: user.documentNumber ?? "",
    sexId: user.sexId ?? undefined,
    dateOfBirth: user.dateOfBirth ?? null,
    categoryLevel: user.categoryLevel ?? null,
    provinceId: user.provinceId ?? null,
    municipalityId: user.municipalityId ?? null,
    phoneDialCode: phone.dialCode,
    phoneNational: phone.national,
    isPhonePublic: user.isPhonePublic === true,
  };
}

interface ApiPlayerAccountFormProps {
  user: UserMeDto;
}

export default function ApiPlayerAccountForm({ user }: ApiPlayerAccountFormProps) {
  const setUserProfile = useAuthStore((state) => state.setUserProfile);
  const hasPlayer = Boolean(user.playerId);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    register,
    formState: { isSubmitting, isValid, isDirty, errors },
  } = useForm({
    resolver: yupResolver(schema) as never,
    mode: "onChange",
    defaultValues: toFormValues(user),
  });

  useEffect(() => {
    reset(toFormValues(user));
  }, [user, reset]);

  const dateOfBirth = watch("dateOfBirth");
  const phoneNational = watch("phoneNational");
  const phoneDialCode = watch("phoneDialCode");
  const provinceId = watch("provinceId");
  const municipalityId = watch("municipalityId");
  const isPhonePublic = watch("isPhonePublic");

  const age = ageFromDateOfBirth(dateOfBirth);
  const canPublishPhone = age != null && age >= 18;
  const hasPhone = Boolean(combinePhone(phoneDialCode, phoneNational));
  const canTogglePublic = canPublishPhone && hasPhone;

  useEffect(() => {
    if (!canTogglePublic && isPhonePublic) {
      setValue("isPhonePublic", false, { shouldDirty: false });
    }
  }, [canTogglePublic, isPhonePublic, setValue]);

  const { data: sexes, isLoading: sexesLoading, isError: sexesError } = useQuery({
    queryKey: ["sexes"],
    queryFn: () => Api.SexService().list(),
  });

  const saveMutation = useMutation({
    mutationFn: (values: ReturnType<typeof toFormValues>) => {
      if (values.sexId == null) {
        throw new Error("Seleccioná tu sexo");
      }
      const phone = combinePhone(values.phoneDialCode, values.phoneNational);
      return Api.UserService().updateMe({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        documentNumber: normalizeDocumentNumber(values.documentNumber),
        sexId: values.sexId,
        dateOfBirth: hasPlayer ? values.dateOfBirth || null : null,
        categoryLevel: hasPlayer ? values.categoryLevel : null,
        provinceId: values.provinceId,
        municipalityId: values.municipalityId,
        phone: phone || null,
        isPhonePublic: values.isPhonePublic && canPublishPhone && Boolean(phone),
      });
    },
    onSuccess: (updated) => {
      setUserProfile(updated);
      toastSuccess("Perfil actualizado");
    },
    onError: (err: Error) => {
      toastError("No se pudo guardar", err.message);
    },
  });

  return (
    <form
      className="space-y-4 rounded-xl border border-border bg-card p-4"
      onSubmit={handleSubmit((values) => saveMutation.mutateAsync(values))}
      noValidate
      data-testid="api-player-account-form"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <InputField
          control={control}
          name="firstName"
          label="Nombre"
          autoComplete="given-name"
          id="account-firstName"
          required
        />
        <InputField
          control={control}
          name="lastName"
          label="Apellido"
          autoComplete="family-name"
          id="account-lastName"
          required
        />
      </div>

      <InputField
        control={control}
        name="documentNumber"
        label="DNI"
        inputMode="numeric"
        autoComplete="off"
        id="account-documentNumber"
        required
        hint="7 u 8 dígitos, sin puntos."
      />

      <SelectField
        control={control}
        name="sexId"
        label="Sexo"
        id="account-sex"
        required
        allowEmpty
        valueAs="number"
        emptyLabel={
          sexesLoading
            ? "Cargando…"
            : sexesError
              ? "No se pudo cargar"
              : "Seleccioná…"
        }
        disabled={sexesLoading || sexesError || !sexes?.length}
        options={(sexes ?? []).map((sex) => ({
          value: String(sex.id),
          label: sex.name,
        }))}
      />

      {hasPlayer ? (
        <>
          <DateField
            control={control}
            name="dateOfBirth"
            label="Fecha de nacimiento (opcional)"
            id="account-dateOfBirth"
          />
          <SelectField
            control={control}
            name="categoryLevel"
            label="Categoría (opcional)"
            id="account-category"
            allowEmpty
            valueAs="number"
            emptyLabel="Sin categoría"
            options={CATEGORY_LEVELS.map((level) => ({
              value: String(level),
              label: formatCategoryLevel(level),
            }))}
          />
        </>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="account-email">Email</Label>
        <Input
          id="account-email"
          type="email"
          value={user.email}
          disabled
          readOnly
        />
        <p className="text-xs text-muted-foreground">
          {user.emailConfirmed
            ? "Correo verificado. El cambio de email se cablea después."
            : "Todavía no verificaste este correo."}
        </p>
      </div>

      <GeographySelectFields
        idPrefix="account-geo"
        provinceId={provinceId ?? null}
        municipalityId={municipalityId ?? null}
        provinceError={errors.provinceId?.message}
        municipalityError={errors.municipalityId?.message}
        onProvinceChange={(id) => {
          setValue("provinceId", id, { shouldDirty: true, shouldValidate: true });
          if (id !== provinceId) {
            setValue("municipalityId", null, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
        }}
        onMunicipalityChange={(id) =>
          setValue("municipalityId", id, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />

      <PhoneField
        control={control}
        dialName="phoneDialCode"
        nationalName="phoneNational"
        id="account-phone"
      />

      <div className="space-y-1.5">
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-input"
            disabled={!canTogglePublic}
            {...register("isPhonePublic")}
          />
          <span>Mostrar mi teléfono a otros jugadores</span>
        </label>
        <p className="text-xs text-muted-foreground">
          {canPublishPhone
            ? "El staff del club siempre puede verlo. Esto solo cambia la visibilidad entre jugadores."
            : "Disponible desde los 18 años, según tu fecha de nacimiento."}
        </p>
      </div>

      <Button
        type="submit"
        disabled={
          isSubmitting ||
          saveMutation.isPending ||
          !isValid ||
          !isDirty ||
          sexesLoading ||
          sexesError
        }
      >
        {saveMutation.isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
