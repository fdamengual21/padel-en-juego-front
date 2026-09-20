import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useQuery } from "@tanstack/react-query";
import * as yup from "yup";
import { CATEGORY_LEVELS, formatCategoryLevel } from "@/domain";
import Api from "@/api/Api";
import { InputField, SelectField, DateField } from "@/components/Form";
import GeographySelectFields from "@/components/GeographySelectFields";
import { Button } from "@/components/ui/button";
import { isValidOptionalDateOfBirth } from "@/lib/dateOfBirth";
import { toIsoDateOnly } from "@/lib/dates";
import {
  isValidArgentineDni,
  normalizeDocumentNumber,
} from "@/lib/documentNumber";
import { toastError, toastSuccess } from "@/lib/toast";
import { isPlayerHomePath } from "@/modules/auth";
import { ROUTES } from "@/router/routes";
import RegisterLegalConsent from "./components/RegisterLegalConsent";

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
  email: yup
    .string()
    .trim()
    .email("Email inválido")
    .required("Ingresá tu email"),
  password: yup
    .string()
    .min(10, "Mínimo 10 caracteres")
    .matches(/[0-9]/, "Incluí un número")
    .matches(/[A-Z]/, "Incluí una mayúscula")
    .matches(/[^A-Za-z0-9]/, "Incluí un carácter especial")
    .required("Ingresá una contraseña"),
  passwordConfirm: yup
    .string()
    .oneOf([yup.ref("password")], "Las contraseñas no coinciden")
    .required("Repetí la contraseña"),
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
  acceptedLegal: yup
    .boolean()
    .oneOf([true], "Debés aceptar la política de privacidad y los términos"),
});

export default function RegisterScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const nextParam = searchParams.get("next");
  const redirectTo = nextParam && !isPlayerHomePath(nextParam) ? nextParam : "";
  const {
    data: legalDocuments,
    isLoading: legalLoading,
    isError: legalError,
  } = useQuery({
    queryKey: ["legal", "current"],
    queryFn: () => Api.LegalService().getCurrent(),
  });
  const {
    data: sexes,
    isLoading: sexesLoading,
    isError: sexesError,
  } = useQuery({
    queryKey: ["sexes"],
    queryFn: () => Api.SexService().list(),
  });

  const methods = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      documentNumber: "",
      sexId: undefined,
      dateOfBirth: null,
      email: "",
      password: "",
      passwordConfirm: "",
      categoryLevel: null,
      provinceId: null,
      municipalityId: null,
      acceptedLegal: false,
    },
  });
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = methods;

  const provinceId = watch("provinceId");
  const municipalityId = watch("municipalityId");
  const today = new Date();
  const dateOfBirthMin = toIsoDateOnly(
    new Date(today.getFullYear() - 99, 0, 1),
  );
  const dateOfBirthMax = toIsoDateOnly(
    new Date(today.getFullYear() - 12, today.getMonth(), today.getDate()),
  );

  const onSubmit = handleSubmit(
    async (values) => {
      setError(null);
      try {
        if (!legalDocuments?.privacy.id || !legalDocuments.terms.id) {
          const message =
            "No pudimos cargar las políticas. Recargá la página e intentá de nuevo.";
          setError(message);
          toastError("No se pudo crear la cuenta", message);
          return;
        }
        await Api.AuthService().register({
          firstName: values.firstName,
          lastName: values.lastName,
          documentNumber: normalizeDocumentNumber(values.documentNumber),
          sexId: values.sexId,
          email: values.email,
          password: values.password,
          dateOfBirth: values.dateOfBirth,
          categoryLevel: values.categoryLevel,
          provinceId: values.provinceId,
          municipalityId: values.municipalityId,
          acceptedPrivacyDocumentId: legalDocuments.privacy.id,
          acceptedTermsDocumentId: legalDocuments.terms.id,
        });
        toastSuccess("Cuenta creada", "Revisá tu correo para verificarla");
        const params = new URLSearchParams({ email: values.email });
        if (redirectTo) params.set("next", redirectTo);
        navigate(`${ROUTES.auth.checkEmail}?${params.toString()}`, {
          replace: true,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo registrar";
        setError(message);
        toastError("No se pudo crear la cuenta", message);
      }
    },
    (formErrors) => {
      const first =
        formErrors.firstName?.message ||
        formErrors.lastName?.message ||
        formErrors.documentNumber?.message ||
        formErrors.sexId?.message ||
        formErrors.dateOfBirth?.message ||
        formErrors.email?.message ||
        formErrors.password?.message ||
        formErrors.passwordConfirm?.message ||
        formErrors.categoryLevel?.message ||
        formErrors.provinceId?.message ||
        formErrors.municipalityId?.message ||
        formErrors.acceptedLegal?.message;
      setError(first ?? "Revisá los datos del formulario");
    },
  );

  return (
    <div
      className="flex min-h-svh items-center justify-center bg-background p-6"
      data-testid="register-screen"
    >
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Padel en juego</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Crear cuenta
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Nombre, apellido, DNI, sexo, email y contraseña son obligatorios. Te
            vamos a pedir que verifiques el correo.
          </p>
        </div>

        <FormProvider {...methods}>
          <form
            className="space-y-4 rounded-xl border border-border bg-card p-5"
            onSubmit={onSubmit}
            noValidate
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                control={control}
                name="firstName"
                label="Nombre"
                autoComplete="given-name"
                id="reg-firstName"
                required
              />
              <InputField
                control={control}
                name="lastName"
                label="Apellido"
                autoComplete="family-name"
                id="reg-lastName"
                required
              />
              <InputField
                control={control}
                name="documentNumber"
                label="DNI"
                inputMode="numeric"
                autoComplete="off"
                id="reg-documentNumber"
                required
                hint="7 u 8 dígitos, sin puntos."
              />
              <SelectField
                control={control}
                name="sexId"
                label="Sexo"
                id="reg-sex"
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
              <DateField
                control={control}
                name="dateOfBirth"
                label="Fecha de nacimiento (opcional)"
                id="reg-dateOfBirth"
                minDate={dateOfBirthMin}
                maxDate={dateOfBirthMax}
                placeholder="Elegí una fecha"
              />
              <SelectField
                control={control}
                name="categoryLevel"
                label="Categoría actual (opcional)"
                id="reg-category"
                allowEmpty
                emptyLabel="Sin categoría"
                valueAs="number"
                options={CATEGORY_LEVELS.map((level) => ({
                  value: String(level),
                  label: formatCategoryLevel(level),
                }))}
              />
            </div>

            <GeographySelectFields
              idPrefix="reg"
              provinceId={provinceId ?? null}
              municipalityId={municipalityId ?? null}
              provinceError={errors.provinceId?.message}
              municipalityError={errors.municipalityId?.message}
              onProvinceChange={(id) => {
                setValue("provinceId", id, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
              onMunicipalityChange={(id) => {
                setValue("municipalityId", id, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
            />

            <InputField
              control={control}
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              id="reg-email"
              required
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                control={control}
                name="password"
                label="Contraseña"
                type="password"
                autoComplete="new-password"
                id="reg-password"
                required
                hint="Mínimo 10 caracteres, mayúscula, número y un carácter especial."
              />
              <InputField
                control={control}
                name="passwordConfirm"
                label="Repetir contraseña"
                type="password"
                autoComplete="new-password"
                id="reg-passwordConfirm"
                required
              />
            </div>

            <RegisterLegalConsent
              documents={legalDocuments}
              isLoading={legalLoading}
              isError={legalError}
            />

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              type="submit"
              className="w-full"
              disabled={
                isSubmitting ||
                !isValid ||
                legalLoading ||
                legalError ||
                sexesLoading ||
                sexesError
              }
            >
              {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
            </Button>
          </form>
        </FormProvider>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link
            to={`${ROUTES.auth.login}${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Ingresá
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          <Link
            to={ROUTES.legal.privacy}
            className="underline-offset-4 hover:underline"
          >
            Privacidad
          </Link>
          {" · "}
          <Link
            to={ROUTES.legal.terms}
            className="underline-offset-4 hover:underline"
          >
            Términos
          </Link>
        </p>
      </div>
    </div>
  );
}
